"""
Modèle Ensemble Optimisé pour les Prédictions Hospitalières
============================================================

Ce module combine :
1. Random Forest (meilleur pour les patterns complexes)
2. Prophet amélioré (avec régresseurs externes)
3. Moyenne pondérée basée sur les performances

Stratégies d'amélioration :
- Feature engineering avancé
- Hyperparameter tuning
- Stacking/Blending des modèles
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

from prophet import Prophet

import joblib


class OptimizedEnsemblePredictor:
    """Modèle ensemble optimisé combinant plusieurs approches."""
    
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.df = None
        self.models = {}
        self.weights = {}
        self.metrics = {}
        self.scaler = StandardScaler()
        
    def load_data(self):
        """Charge les données."""
        print("📂 Chargement des données...")
        self.df = pd.read_csv(self.data_path)
        self.df['date'] = pd.to_datetime(self.df['date'])
        
        if 'nb_admissions' in self.df.columns:
            self.df['admissions'] = self.df['nb_admissions']
        
        self.df = self.df.sort_values('date').reset_index(drop=True)
        print(f"   ✅ {len(self.df)} jours chargés")
        return self.df
    
    def create_advanced_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Crée des features avancées pour le ML."""
        df = df.copy()
        
        # === Features temporelles de base ===
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['quarter'] = df['date'].dt.quarter
        df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
        df['year'] = df['date'].dt.year
        
        # === Features cycliques (pour capturer la périodicité) ===
        df['sin_day_week'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['cos_day_week'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['sin_month'] = np.sin(2 * np.pi * df['month'] / 12)
        df['cos_month'] = np.cos(2 * np.pi * df['month'] / 12)
        df['sin_day_month'] = np.sin(2 * np.pi * df['day_of_month'] / 31)
        df['cos_day_month'] = np.cos(2 * np.pi * df['day_of_month'] / 31)
        
        # === Features binaires ===
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_monday'] = (df['day_of_week'] == 0).astype(int)
        df['is_friday'] = (df['day_of_week'] == 4).astype(int)
        
        # Saisons
        df['is_winter'] = df['month'].isin([12, 1, 2]).astype(int)
        df['is_spring'] = df['month'].isin([3, 4, 5]).astype(int)
        df['is_summer'] = df['month'].isin([6, 7, 8]).astype(int)
        df['is_autumn'] = df['month'].isin([9, 10, 11]).astype(int)
        
        # Début/fin de mois
        df['is_month_start'] = (df['day_of_month'] <= 3).astype(int)
        df['is_month_end'] = (df['day_of_month'] >= 28).astype(int)
        
        # === Lags (historique) ===
        for lag in [1, 2, 3, 4, 5, 6, 7, 14, 21, 28, 30]:
            df[f'lag_{lag}'] = df['admissions'].shift(lag)
        
        # === Moyennes mobiles ===
        for window in [3, 5, 7, 14, 21, 30]:
            df[f'ma_{window}'] = df['admissions'].rolling(window).mean()
            df[f'std_{window}'] = df['admissions'].rolling(window).std()
            df[f'min_{window}'] = df['admissions'].rolling(window).min()
            df[f'max_{window}'] = df['admissions'].rolling(window).max()
        
        # === Moyennes mobiles exponentielles ===
        for span in [7, 14, 30]:
            df[f'ema_{span}'] = df['admissions'].ewm(span=span).mean()
        
        # === Tendances ===
        df['trend_1d'] = df['admissions'].diff(1)
        df['trend_7d'] = df['admissions'].diff(7)
        df['trend_14d'] = df['admissions'].diff(14)
        df['trend_30d'] = df['admissions'].diff(30)
        
        # === Variations relatives ===
        df['pct_change_1d'] = df['admissions'].pct_change(1)
        df['pct_change_7d'] = df['admissions'].pct_change(7)
        
        # === Features basées sur le même jour de la semaine précédente ===
        df['same_day_last_week'] = df['admissions'].shift(7)
        df['same_day_2weeks_ago'] = df['admissions'].shift(14)
        df['same_day_4weeks_ago'] = df['admissions'].shift(28)
        
        # === Ratio par rapport à la moyenne mobile ===
        df['ratio_to_ma7'] = df['admissions'] / df['ma_7']
        df['ratio_to_ma30'] = df['admissions'] / df['ma_30']
        
        # === Features événements (si disponibles) ===
        if 'evenement_special' in df.columns:
            # One-hot encoding des événements
            df['is_covid'] = df['evenement_special'].str.contains('covid', case=False, na=False).astype(int)
            df['is_grippe'] = df['evenement_special'].str.contains('grippe', case=False, na=False).astype(int)
            df['is_canicule'] = df['evenement_special'].str.contains('canicule', case=False, na=False).astype(int)
            df['is_bronchiolite'] = df['evenement_special'].str.contains('bronchiolite', case=False, na=False).astype(int)
            df['is_normal'] = (df['evenement_special'] == 'normal').astype(int)
        
        return df
    
    def get_feature_columns(self, df: pd.DataFrame) -> list:
        """Retourne la liste des colonnes features."""
        exclude = ['date', 'admissions', 'nb_admissions', 'evenement_special', 'saison', 'jour_semaine']
        return [c for c in df.columns if c not in exclude and df[c].dtype in ['int64', 'float64']]
    
    def train_random_forest_optimized(self, X_train, y_train, X_test, y_test):
        """Entraîne un Random Forest avec hyperparameter tuning."""
        print("\n🌲 Entraînement Random Forest optimisé...")
        
        # Grid search (simplifié pour la rapidité)
        param_grid = {
            'n_estimators': [100, 200],
            'max_depth': [10, 15, 20],
            'min_samples_split': [2, 5],
            'min_samples_leaf': [1, 2],
        }
        
        rf = RandomForestRegressor(random_state=42, n_jobs=-1)
        
        # Validation croisée temporelle
        tscv = TimeSeriesSplit(n_splits=3)
        
        grid_search = GridSearchCV(
            rf, param_grid, cv=tscv, 
            scoring='neg_mean_absolute_error',
            n_jobs=-1, verbose=0
        )
        
        print("   ⏳ Grid search en cours...")
        grid_search.fit(X_train, y_train)
        
        best_model = grid_search.best_estimator_
        print(f"   ✅ Meilleurs paramètres: {grid_search.best_params_}")
        
        # Prédictions
        y_pred = best_model.predict(X_test)
        
        metrics = {
            'mae': mean_absolute_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mape': np.mean(np.abs((y_test - y_pred) / y_test)) * 100,
            'r2': r2_score(y_test, y_pred),
        }
        
        print(f"   📊 MAE: {metrics['mae']:.2f}, R²: {metrics['r2']:.4f}")
        
        self.models['random_forest'] = best_model
        self.metrics['random_forest'] = metrics
        
        return y_pred, metrics
    
    def train_gradient_boosting(self, X_train, y_train, X_test, y_test):
        """Entraîne un Gradient Boosting."""
        print("\n🚀 Entraînement Gradient Boosting...")
        
        gb = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=8,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        gb.fit(X_train, y_train)
        y_pred = gb.predict(X_test)
        
        metrics = {
            'mae': mean_absolute_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mape': np.mean(np.abs((y_test - y_pred) / y_test)) * 100,
            'r2': r2_score(y_test, y_pred),
        }
        
        print(f"   📊 MAE: {metrics['mae']:.2f}, R²: {metrics['r2']:.4f}")
        
        self.models['gradient_boosting'] = gb
        self.metrics['gradient_boosting'] = metrics
        
        return y_pred, metrics
    
    def train_prophet_enhanced(self, df: pd.DataFrame, test_size: int):
        """Entraîne Prophet avec des régresseurs externes."""
        print("\n🔮 Entraînement Prophet amélioré...")
        
        # Préparer les données Prophet
        df_prophet = df[['date', 'admissions']].copy()
        df_prophet.columns = ['ds', 'y']
        
        # Ajouter des régresseurs externes
        df_prophet['is_weekend'] = (df_prophet['ds'].dt.dayofweek >= 5).astype(float)
        df_prophet['is_winter'] = df_prophet['ds'].dt.month.isin([12, 1, 2]).astype(float)
        df_prophet['day_of_week'] = df_prophet['ds'].dt.dayofweek.astype(float)
        
        # Ajouter lag-7 comme régresseur
        df_prophet['lag_7'] = df_prophet['y'].shift(7)
        df_prophet = df_prophet.dropna()
        
        train_df = df_prophet.iloc[:-test_size]
        test_df = df_prophet.iloc[-test_size:]
        
        # Créer le modèle Prophet avec régresseurs
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.1,
            seasonality_prior_scale=10,
            interval_width=0.95,
        )
        
        # Ajouter les régresseurs
        model.add_regressor('is_weekend')
        model.add_regressor('is_winter')
        model.add_regressor('lag_7')
        
        # Saisonnalité mensuelle
        model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        
        print("   ⏳ Fitting...")
        model.fit(train_df)
        
        # Prédictions
        forecast = model.predict(test_df)
        y_pred = forecast['yhat'].values
        y_test = test_df['y'].values
        
        metrics = {
            'mae': mean_absolute_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mape': np.mean(np.abs((y_test - y_pred) / y_test)) * 100,
            'r2': r2_score(y_test, y_pred),
        }
        
        print(f"   📊 MAE: {metrics['mae']:.2f}, R²: {metrics['r2']:.4f}")
        
        self.models['prophet'] = model
        self.metrics['prophet'] = metrics
        
        return y_pred, metrics
    
    def calculate_ensemble_weights(self):
        """Calcule les poids optimaux pour l'ensemble basés sur les performances."""
        print("\n⚖️ Calcul des poids de l'ensemble...")
        
        # Utiliser l'inverse de la MAE comme poids
        total_inv_mae = sum(1/m['mae'] for m in self.metrics.values())
        
        for model_name, metrics in self.metrics.items():
            weight = (1/metrics['mae']) / total_inv_mae
            self.weights[model_name] = weight
            print(f"   {model_name}: {weight:.3f}")
        
        return self.weights
    
    def train_full_pipeline(self, test_size: int = 60):
        """Pipeline complet d'entraînement."""
        print("\n" + "="*70)
        print("🚀 PIPELINE D'ENTRAÎNEMENT ENSEMBLE OPTIMISÉ")
        print("="*70)
        
        # Charger et préparer les données
        self.load_data()
        df_features = self.create_advanced_features(self.df)
        df_features = df_features.dropna()
        
        # Séparer features et target
        feature_cols = self.get_feature_columns(df_features)
        print(f"\n📊 {len(feature_cols)} features créées")
        
        X = df_features[feature_cols]
        y = df_features['admissions']
        
        # Split temporel
        X_train, X_test = X.iloc[:-test_size], X.iloc[-test_size:]
        y_train, y_test = y.iloc[:-test_size], y.iloc[-test_size:]
        
        print(f"   Train: {len(X_train)}, Test: {len(X_test)}")
        
        # Entraîner les modèles ML
        rf_pred, _ = self.train_random_forest_optimized(X_train, y_train, X_test, y_test)
        gb_pred, _ = self.train_gradient_boosting(X_train, y_train, X_test, y_test)
        
        # Prophet
        prophet_pred, _ = self.train_prophet_enhanced(self.df, test_size)
        
        # Calculer les poids
        self.calculate_ensemble_weights()
        
        # Prédiction ensemble
        # Aligner les prédictions (Prophet peut avoir moins de lignes)
        min_len = min(len(rf_pred), len(gb_pred), len(prophet_pred))
        ensemble_pred = (
            self.weights['random_forest'] * rf_pred[-min_len:] +
            self.weights['gradient_boosting'] * gb_pred[-min_len:] +
            self.weights['prophet'] * prophet_pred[-min_len:]
        )
        
        y_test_aligned = y_test.iloc[-min_len:].values
        
        ensemble_metrics = {
            'mae': mean_absolute_error(y_test_aligned, ensemble_pred),
            'rmse': np.sqrt(mean_squared_error(y_test_aligned, ensemble_pred)),
            'mape': np.mean(np.abs((y_test_aligned - ensemble_pred) / y_test_aligned)) * 100,
            'r2': r2_score(y_test_aligned, ensemble_pred),
        }
        
        self.metrics['ensemble'] = ensemble_metrics
        
        # Résumé
        print("\n" + "="*70)
        print("📊 RÉSUMÉ DES PERFORMANCES")
        print("="*70)
        print(f"\n{'Modèle':<20} {'MAE':>10} {'RMSE':>10} {'MAPE':>10} {'R²':>10}")
        print("-"*60)
        
        for model, metrics in self.metrics.items():
            print(f"{model:<20} {metrics['mae']:>10.2f} {metrics['rmse']:>10.2f} "
                  f"{metrics['mape']:>9.2f}% {metrics['r2']:>10.4f}")
        
        return self.metrics
    
    def predict_future(self, days: int = 30) -> pd.DataFrame:
        """Génère des prédictions futures avec l'ensemble."""
        print(f"\n🔮 Génération de prédictions pour {days} jours...")
        
        # Dernière date connue
        last_date = self.df['date'].max()
        
        predictions = []
        df_extended = self.df.copy()
        
        for i in range(days):
            future_date = last_date + timedelta(days=i+1)
            
            # Ajouter une ligne provisoire
            new_row = df_extended.iloc[-1:].copy()
            new_row['date'] = future_date
            new_row['admissions'] = np.nan
            df_extended = pd.concat([df_extended, new_row], ignore_index=True)
            
            # Créer les features
            df_feat = self.create_advanced_features(df_extended)
            feature_cols = self.get_feature_columns(df_feat)
            
            # Dernière ligne (à prédire)
            X_pred = df_feat[feature_cols].iloc[-1:].fillna(0)
            
            # Prédictions individuelles
            rf_pred = self.models['random_forest'].predict(X_pred)[0]
            gb_pred = self.models['gradient_boosting'].predict(X_pred)[0]
            
            # Ensemble
            ensemble_pred = (
                self.weights['random_forest'] * rf_pred +
                self.weights['gradient_boosting'] * gb_pred
            )
            
            # Mettre à jour pour les prochains lags
            df_extended.loc[df_extended['date'] == future_date, 'admissions'] = ensemble_pred
            
            # Calculer l'intervalle de confiance (basé sur RMSE)
            rmse = self.metrics['ensemble']['rmse']
            lower = max(0, ensemble_pred - 1.96 * rmse)
            upper = ensemble_pred + 1.96 * rmse
            
            predictions.append({
                'date': future_date,
                'prediction': ensemble_pred,
                'lower_bound': lower,
                'upper_bound': upper,
                'rf_prediction': rf_pred,
                'gb_prediction': gb_pred,
            })
        
        return pd.DataFrame(predictions)
    
    def save_models(self, output_dir: str):
        """Sauvegarde tous les modèles et métriques."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Sauvegarder les modèles ML
        for name, model in self.models.items():
            if name != 'prophet':
                path = os.path.join(output_dir, f'{name}_optimized.pkl')
                joblib.dump(model, path)
                print(f"   💾 {name}: {path}")
        
        # Métriques et poids
        config = {
            'metrics': self.metrics,
            'weights': self.weights,
            'trained_at': datetime.now().isoformat(),
        }
        
        config_path = os.path.join(output_dir, 'ensemble_config.json')
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"   💾 Config: {config_path}")
    
    def generate_predictions_json(self, output_path: str, days: int = 30):
        """Génère le fichier JSON des prédictions."""
        predictions = self.predict_future(days)
        
        output = {
            'model': 'OptimizedEnsemble',
            'components': list(self.weights.keys()),
            'weights': self.weights,
            'generated_at': datetime.now().isoformat(),
            'metrics': self.metrics['ensemble'],
            'predictions': [
                {
                    'date': row['date'].strftime('%Y-%m-%d'),
                    'predicted_admissions': round(row['prediction']),
                    'lower_bound': round(row['lower_bound']),
                    'upper_bound': round(row['upper_bound']),
                    'confidence': 0.95,
                }
                for _, row in predictions.iterrows()
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"   💾 Prédictions: {output_path}")
        return output


def main():
    """Point d'entrée principal."""
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    models_dir = os.path.join(data_dir, 'models')
    
    # Créer et entraîner l'ensemble
    predictor = OptimizedEnsemblePredictor(
        os.path.join(data_dir, 'etablissement.csv')
    )
    
    metrics = predictor.train_full_pipeline(test_size=60)
    
    # Sauvegarder
    predictor.save_models(models_dir)
    predictor.generate_predictions_json(
        os.path.join(data_dir, 'predictions_ensemble_optimized.json'),
        days=30
    )
    
    # Afficher quelques prédictions
    predictions = predictor.predict_future(7)
    print("\n📅 Prédictions pour les 7 prochains jours:")
    for _, row in predictions.iterrows():
        print(f"   {row['date'].strftime('%Y-%m-%d')}: {row['prediction']:.0f} "
              f"[{row['lower_bound']:.0f} - {row['upper_bound']:.0f}]")


if __name__ == '__main__':
    main()
