"""
Prédicteur de Production - Admissions Hospitalières
====================================================

Ce module fournit les prédictions pour la production en utilisant :
- Gradient Boosting (modèle principal)
- Random Forest (modèle de secours/validation)
- Prophet (pour la décomposition saisonnière uniquement)

ARIMA n'est PAS inclus car ses performances sont insuffisantes (R² < 0).
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import warnings
warnings.filterwarnings('ignore')

from prophet import Prophet
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib


class ProductionPredictor:
    """
    Prédicteur optimisé pour la production.
    
    Utilise un ensemble de Gradient Boosting (principal) et Random Forest (validation).
    """
    
    def __init__(self, data_path: str = None, models_dir: str = None):
        self.data_path = data_path
        self.models_dir = models_dir
        self.df = None
        self.df_daily = None
        self.gb_model = None
        self.rf_model = None
        self.prophet_model = None
        self.feature_cols = None
        self.metrics = {}
        
    def load_data(self, data_path: str = None):
        """Charge et prépare les données."""
        if data_path:
            self.data_path = data_path
            
        print("📂 Chargement des données...")
        self.df = pd.read_csv(self.data_path)
        
        # Détecter la colonne de date
        date_col = None
        for col in ['date', 'date_admission', 'ds']:
            if col in self.df.columns:
                date_col = col
                break
        
        self.df['date'] = pd.to_datetime(self.df[date_col])
        
        # Agréger par jour
        if 'admissions' not in self.df.columns and 'nb_admissions' not in self.df.columns:
            self.df_daily = self.df.groupby('date').size().reset_index(name='admissions')
        else:
            target_col = 'admissions' if 'admissions' in self.df.columns else 'nb_admissions'
            self.df_daily = self.df.groupby('date')[target_col].sum().reset_index()
            self.df_daily.columns = ['date', 'admissions']
        
        self.df_daily = self.df_daily.sort_values('date').reset_index(drop=True)
        
        print(f"   ✅ {len(self.df_daily)} jours chargés")
        return self.df_daily
    
    def create_features(self, df):
        """Crée les features optimisées pour la prédiction."""
        df = df.copy()
        
        # Features temporelles
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['quarter'] = df['date'].dt.quarter
        df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
        df['year'] = df['date'].dt.year
        
        # Features cycliques
        df['sin_day_week'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['cos_day_week'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['sin_month'] = np.sin(2 * np.pi * df['month'] / 12)
        df['cos_month'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Features binaires
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_monday'] = (df['day_of_week'] == 0).astype(int)
        df['is_winter'] = df['month'].isin([12, 1, 2]).astype(int)
        df['is_spring'] = df['month'].isin([3, 4, 5]).astype(int)
        df['is_summer'] = df['month'].isin([6, 7, 8]).astype(int)
        
        # Lags (features les plus importantes selon notre analyse)
        for lag in [1, 2, 3, 7, 14, 21, 28, 30]:
            df[f'lag_{lag}'] = df['admissions'].shift(lag)
        
        # Moyennes mobiles
        for window in [7, 14, 30]:
            df[f'ma_{window}'] = df['admissions'].rolling(window=window).mean()
            df[f'std_{window}'] = df['admissions'].rolling(window=window).std()
        
        # Tendances (très importantes pour Gradient Boosting)
        df['trend_7d'] = df['admissions'] - df['admissions'].shift(7)
        df['trend_30d'] = df['admissions'] - df['admissions'].shift(30)
        
        return df
    
    def get_feature_columns(self):
        """Retourne la liste des colonnes de features."""
        return [
            'day_of_week', 'day_of_month', 'month', 'quarter', 'week_of_year',
            'sin_day_week', 'cos_day_week', 'sin_month', 'cos_month',
            'is_weekend', 'is_monday', 'is_winter', 'is_spring', 'is_summer',
            'lag_1', 'lag_2', 'lag_3', 'lag_7', 'lag_14', 'lag_21', 'lag_28', 'lag_30',
            'ma_7', 'ma_14', 'ma_30', 'std_7', 'std_14', 'std_30',
            'trend_7d', 'trend_30d'
        ]
    
    def train(self, train_ratio: float = 0.8):
        """
        Entraîne les modèles de production.
        
        Args:
            train_ratio: Proportion des données pour l'entraînement (défaut: 0.8)
        """
        print("\n" + "=" * 60)
        print("🚀 ENTRAÎNEMENT DES MODÈLES DE PRODUCTION")
        print("=" * 60)
        
        # Créer features
        df_features = self.create_features(self.df_daily)
        df_features = df_features.dropna()
        
        self.feature_cols = self.get_feature_columns()
        
        # Split temporel
        train_end = int(len(df_features) * train_ratio)
        
        train_df = df_features.iloc[:train_end]
        test_df = df_features.iloc[train_end:]
        
        X_train = train_df[self.feature_cols]
        y_train = train_df['admissions']
        X_test = test_df[self.feature_cols]
        y_test = test_df['admissions']
        
        print(f"\n📊 Split {int(train_ratio*100)}/{int((1-train_ratio)*100)}:")
        print(f"   Train: {len(X_train)} jours")
        print(f"   Test: {len(X_test)} jours")
        
        # 1. Entraîner Gradient Boosting (modèle principal)
        print("\n🚀 Entraînement Gradient Boosting (modèle principal)...")
        self.gb_model = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=8,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=3,
            subsample=0.8,
            random_state=42
        )
        self.gb_model.fit(X_train, y_train)
        
        gb_pred = self.gb_model.predict(X_test)
        self.metrics['gradient_boosting'] = self._calculate_metrics(y_test, gb_pred)
        
        print(f"   ✅ MAE: {self.metrics['gradient_boosting']['mae']:.2f}")
        print(f"   ✅ R²:  {self.metrics['gradient_boosting']['r2']:.4f}")
        
        # 2. Entraîner Random Forest (modèle de validation)
        print("\n🌲 Entraînement Random Forest (modèle de validation)...")
        self.rf_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=42,
            n_jobs=-1
        )
        self.rf_model.fit(X_train, y_train)
        
        rf_pred = self.rf_model.predict(X_test)
        self.metrics['random_forest'] = self._calculate_metrics(y_test, rf_pred)
        
        print(f"   ✅ MAE: {self.metrics['random_forest']['mae']:.2f}")
        print(f"   ✅ R²:  {self.metrics['random_forest']['r2']:.4f}")
        
        # 3. Entraîner Prophet (pour décomposition saisonnière)
        print("\n🔮 Entraînement Prophet (analyse saisonnière)...")
        prophet_train = pd.DataFrame({
            'ds': train_df['date'],
            'y': train_df['admissions']
        })
        
        self.prophet_model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            seasonality_mode='additive',
            interval_width=0.95
        )
        self.prophet_model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        self.prophet_model.fit(prophet_train)
        
        print("   ✅ Prophet entraîné (utilisé pour analyse saisonnière)")
        
        # Résumé
        print("\n" + "-" * 60)
        print("📊 RÉSUMÉ DES PERFORMANCES (sur ensemble de test)")
        print("-" * 60)
        print(f"{'Modèle':<20} {'MAE':>10} {'RMSE':>10} {'R²':>10}")
        print("-" * 50)
        print(f"{'Gradient Boosting':<20} {self.metrics['gradient_boosting']['mae']:>10.2f} "
              f"{self.metrics['gradient_boosting']['rmse']:>10.2f} "
              f"{self.metrics['gradient_boosting']['r2']:>10.4f}")
        print(f"{'Random Forest':<20} {self.metrics['random_forest']['mae']:>10.2f} "
              f"{self.metrics['random_forest']['rmse']:>10.2f} "
              f"{self.metrics['random_forest']['r2']:>10.4f}")
        
        return self.metrics
    
    def _calculate_metrics(self, y_true, y_pred):
        """Calcule les métriques de performance."""
        y_true_safe = np.where(y_true == 0, 1, y_true)
        return {
            'mae': mean_absolute_error(y_true, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
            'mape': np.mean(np.abs((y_true - y_pred) / y_true_safe)) * 100,
            'r2': r2_score(y_true, y_pred)
        }
    
    def predict(self, days: int = 30, return_confidence: bool = True):
        """
        Génère des prédictions pour les jours futurs.
        
        Args:
            days: Nombre de jours à prédire
            return_confidence: Inclure les intervalles de confiance
        
        Returns:
            DataFrame avec les prédictions
        """
        print(f"\n🔮 Génération de prédictions pour {days} jours...")
        
        df_extended = self.df_daily.copy()
        predictions = []
        
        for i in range(days):
            # Créer features pour le jour à prédire
            df_features = self.create_features(df_extended)
            last_features = df_features[self.feature_cols].iloc[-1:].fillna(0)
            
            # Prédiction Gradient Boosting (principal)
            gb_pred = self.gb_model.predict(last_features)[0]
            
            # Prédiction Random Forest (validation)
            rf_pred = self.rf_model.predict(last_features)[0]
            
            # Prédiction finale (moyenne pondérée favorisant GB)
            # GB a un meilleur R², donc on lui donne plus de poids
            final_pred = 0.7 * gb_pred + 0.3 * rf_pred
            final_pred = max(0, final_pred)  # Assurer valeur positive
            
            # Ajouter à l'historique pour la prochaine prédiction
            next_date = df_extended['date'].max() + timedelta(days=1)
            df_extended = pd.concat([
                df_extended,
                pd.DataFrame([{'date': next_date, 'admissions': final_pred}])
            ], ignore_index=True)
            
            # Calculer intervalles de confiance
            if return_confidence:
                # Basé sur le RMSE historique
                rmse = self.metrics['gradient_boosting']['rmse']
                lower = max(0, final_pred - 1.96 * rmse)
                upper = final_pred + 1.96 * rmse
            
            predictions.append({
                'date': next_date,
                'prediction': round(final_pred),
                'gb_prediction': round(gb_pred),
                'rf_prediction': round(rf_pred),
                'lower_bound': round(lower) if return_confidence else None,
                'upper_bound': round(upper) if return_confidence else None,
                'confidence': 0.95 if return_confidence else None
            })
        
        return pd.DataFrame(predictions)
    
    def get_seasonality_decomposition(self):
        """Retourne la décomposition saisonnière via Prophet."""
        if self.prophet_model is None:
            raise ValueError("Le modèle doit d'abord être entraîné")
        
        future = self.prophet_model.make_future_dataframe(periods=30)
        forecast = self.prophet_model.predict(future)
        
        return {
            'trend': forecast[['ds', 'trend']],
            'weekly': forecast[['ds', 'weekly']] if 'weekly' in forecast.columns else None,
            'yearly': forecast[['ds', 'yearly']] if 'yearly' in forecast.columns else None,
            'monthly': forecast[['ds', 'monthly']] if 'monthly' in forecast.columns else None,
        }
    
    def save_models(self, output_dir: str):
        """Sauvegarde les modèles entraînés."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Sauvegarder les modèles
        joblib.dump(self.gb_model, os.path.join(output_dir, 'gradient_boosting_prod.pkl'))
        joblib.dump(self.rf_model, os.path.join(output_dir, 'random_forest_prod.pkl'))
        joblib.dump(self.prophet_model, os.path.join(output_dir, 'prophet_prod.pkl'))
        
        # Sauvegarder les métriques et config
        config = {
            'models': ['gradient_boosting', 'random_forest', 'prophet'],
            'primary_model': 'gradient_boosting',
            'backup_model': 'random_forest',
            'feature_columns': self.feature_cols,
            'metrics': self.metrics,
            'ensemble_weights': {'gradient_boosting': 0.7, 'random_forest': 0.3},
            'trained_at': datetime.now().isoformat(),
            'note': 'ARIMA exclus car performances insuffisantes (R² < 0)'
        }
        
        with open(os.path.join(output_dir, 'production_config.json'), 'w') as f:
            json.dump(config, f, indent=2, default=str)
        
        print(f"\n💾 Modèles sauvegardés dans: {output_dir}")
        return output_dir
    
    def load_models(self, models_dir: str):
        """Charge des modèles pré-entraînés."""
        self.gb_model = joblib.load(os.path.join(models_dir, 'gradient_boosting_prod.pkl'))
        self.rf_model = joblib.load(os.path.join(models_dir, 'random_forest_prod.pkl'))
        self.prophet_model = joblib.load(os.path.join(models_dir, 'prophet_prod.pkl'))
        
        with open(os.path.join(models_dir, 'production_config.json'), 'r') as f:
            config = json.load(f)
        
        self.feature_cols = config['feature_columns']
        self.metrics = config['metrics']
        
        print(f"✅ Modèles chargés depuis: {models_dir}")
        return config
    
    def generate_predictions_json(self, output_path: str, days: int = 30):
        """Génère un fichier JSON avec les prédictions pour l'API."""
        predictions = self.predict(days=days)
        
        output = {
            'model': 'Ensemble (Gradient Boosting + Random Forest)',
            'primary_model': 'Gradient Boosting',
            'backup_model': 'Random Forest',
            'weights': {'gradient_boosting': 0.7, 'random_forest': 0.3},
            'generated_at': datetime.now().isoformat(),
            'metrics': {
                'gradient_boosting': {k: round(v, 4) for k, v in self.metrics['gradient_boosting'].items()},
                'random_forest': {k: round(v, 4) for k, v in self.metrics['random_forest'].items()}
            },
            'predictions': predictions.to_dict(orient='records')
        }
        
        # Convertir les dates en strings
        for pred in output['predictions']:
            pred['date'] = pred['date'].strftime('%Y-%m-%d')
        
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"💾 Prédictions JSON: {output_path}")
        return output


def main():
    """Point d'entrée principal."""
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    models_dir = os.path.join(data_dir, 'models')
    
    # Créer le prédicteur
    predictor = ProductionPredictor()
    
    # Charger les données
    predictor.load_data(os.path.join(data_dir, 'admissions_complet.csv'))
    
    # Entraîner les modèles
    predictor.train(train_ratio=0.8)
    
    # Sauvegarder
    predictor.save_models(models_dir)
    
    # Générer les prédictions
    predictions = predictor.predict(days=30)
    
    print("\n" + "=" * 60)
    print("📅 PRÉDICTIONS POUR LES 7 PROCHAINS JOURS")
    print("=" * 60)
    for _, row in predictions.head(7).iterrows():
        print(f"   {row['date'].strftime('%Y-%m-%d')}: {row['prediction']} admissions "
              f"[{row['lower_bound']} - {row['upper_bound']}]")
    
    # Sauvegarder les prédictions JSON
    predictor.generate_predictions_json(
        os.path.join(data_dir, 'predictions_production.json'),
        days=30
    )
    
    print("\n✅ Production predictor prêt!")


if __name__ == '__main__':
    main()
