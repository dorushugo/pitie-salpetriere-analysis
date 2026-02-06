"""
Comparaison des Modèles avec Split 80/20 pour le Rapport
=========================================================

Ce script entraîne et compare 4 modèles de prédiction :
- Prophet (Facebook)
- ARIMA
- Random Forest
- Gradient Boosting

Avec une répartition : 80% entraînement / 20% test
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import warnings
warnings.filterwarnings('ignore')

# Prophet
from prophet import Prophet

# ARIMA
from statsmodels.tsa.arima.model import ARIMA

# Machine Learning
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit

import joblib


class ModelComparison80_20:
    """Compare les modèles avec un split 80/20."""
    
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.df = None
        self.df_daily = None
        self.train_size = 0.80
        self.results = {}
        
    def load_and_prepare_data(self):
        """Charge les données et agrège par jour."""
        print("=" * 70)
        print("📂 CHARGEMENT DES DONNÉES")
        print("=" * 70)
        
        self.df = pd.read_csv(self.data_path)
        
        # Détecter la colonne de date
        date_col = None
        for col in ['date', 'date_admission', 'ds']:
            if col in self.df.columns:
                date_col = col
                break
        
        if date_col is None:
            raise ValueError("Aucune colonne de date trouvée")
        
        self.df['date'] = pd.to_datetime(self.df[date_col])
        
        # Agréger par jour si nécessaire
        if 'admissions' not in self.df.columns and 'nb_admissions' not in self.df.columns:
            print("   Agrégation des données par jour...")
            self.df_daily = self.df.groupby('date').size().reset_index(name='admissions')
        elif 'nb_admissions' in self.df.columns:
            self.df_daily = self.df.groupby('date')['nb_admissions'].sum().reset_index()
            self.df_daily.columns = ['date', 'admissions']
        else:
            self.df_daily = self.df.groupby('date')['admissions'].sum().reset_index()
        
        self.df_daily = self.df_daily.sort_values('date').reset_index(drop=True)
        
        print(f"   ✅ {len(self.df_daily)} jours chargés")
        print(f"   📅 Période: {self.df_daily['date'].min().date()} → {self.df_daily['date'].max().date()}")
        print(f"   📊 Admissions moyennes: {self.df_daily['admissions'].mean():.0f}/jour")
        print(f"   📈 Min: {self.df_daily['admissions'].min():.0f}, Max: {self.df_daily['admissions'].max():.0f}")
        
        return self.df_daily
    
    def get_split_indices(self):
        """Calcule les indices pour le split 80/20."""
        n = len(self.df_daily)
        train_end = int(n * self.train_size)
        
        print(f"\n📊 SPLIT 80/20:")
        print(f"   Train: {train_end} jours (80%)")
        print(f"   Test:  {n - train_end} jours (20%)")
        print(f"   Date de coupure: {self.df_daily.iloc[train_end]['date'].date()}")
        
        return train_end
    
    def calculate_metrics(self, y_true, y_pred, model_name):
        """Calcule les métriques de performance."""
        # Éviter division par zéro pour MAPE
        y_true_safe = np.where(y_true == 0, 1, y_true)
        
        metrics = {
            'mae': mean_absolute_error(y_true, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
            'mape': np.mean(np.abs((y_true - y_pred) / y_true_safe)) * 100,
            'r2': r2_score(y_true, y_pred)
        }
        
        return metrics
    
    def add_french_holidays(self):
        """Ajoute les jours fériés français."""
        holidays = pd.DataFrame({
            'holiday': 'jour_ferie',
            'ds': pd.to_datetime([
                # 2020-2025 (simplifié)
                '2020-01-01', '2020-05-01', '2020-05-08', '2020-07-14', '2020-11-11', '2020-12-25',
                '2021-01-01', '2021-05-01', '2021-05-08', '2021-07-14', '2021-11-11', '2021-12-25',
                '2022-01-01', '2022-05-01', '2022-05-08', '2022-07-14', '2022-11-11', '2022-12-25',
                '2023-01-01', '2023-05-01', '2023-05-08', '2023-07-14', '2023-11-11', '2023-12-25',
                '2024-01-01', '2024-05-01', '2024-05-08', '2024-07-14', '2024-11-11', '2024-12-25',
                '2025-01-01', '2025-05-01', '2025-05-08', '2025-07-14', '2025-11-11', '2025-12-25',
            ]),
            'lower_window': -1,
            'upper_window': 1,
        })
        return holidays
    
    def train_prophet(self, train_df, test_df):
        """Entraîne le modèle Prophet."""
        print("\n" + "-" * 50)
        print("🔮 PROPHET")
        print("-" * 50)
        
        # Format Prophet
        train_prophet = pd.DataFrame({
            'ds': train_df['date'],
            'y': train_df['admissions']
        })
        
        # Créer et entraîner le modèle
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            seasonality_mode='additive',
            interval_width=0.95,
            holidays=self.add_french_holidays()
        )
        model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        
        print("   ⏳ Entraînement...")
        model.fit(train_prophet)
        
        # Prédictions sur test
        test_dates = pd.DataFrame({'ds': test_df['date']})
        forecast = model.predict(test_dates)
        
        predictions = forecast['yhat'].values
        actual = test_df['admissions'].values
        
        metrics = self.calculate_metrics(actual, predictions, 'Prophet')
        
        print(f"   ✅ MAE:  {metrics['mae']:.2f} admissions")
        print(f"   ✅ RMSE: {metrics['rmse']:.2f}")
        print(f"   ✅ MAPE: {metrics['mape']:.2f}%")
        print(f"   ✅ R²:   {metrics['r2']:.4f}")
        
        self.results['Prophet'] = {
            'metrics': metrics,
            'predictions': predictions,
            'actual': actual,
            'model': model
        }
        
        return model, metrics
    
    def train_arima(self, train_df, test_df):
        """Entraîne le modèle ARIMA."""
        print("\n" + "-" * 50)
        print("📈 ARIMA")
        print("-" * 50)
        
        train_series = train_df['admissions'].values
        test_series = test_df['admissions'].values
        
        # Différents ordres ARIMA à tester
        orders_to_test = [(2, 1, 2), (1, 1, 1), (3, 1, 3), (2, 1, 1)]
        best_metrics = None
        best_model = None
        best_order = None
        
        for order in orders_to_test:
            try:
                print(f"   Test ordre {order}...")
                model = ARIMA(train_series, order=order)
                model_fit = model.fit()
                
                # Prédictions
                predictions = model_fit.forecast(steps=len(test_series))
                metrics = self.calculate_metrics(test_series, predictions, f'ARIMA{order}')
                
                if best_metrics is None or metrics['mae'] < best_metrics['mae']:
                    best_metrics = metrics
                    best_model = model_fit
                    best_order = order
                    best_predictions = predictions
                    
            except Exception as e:
                print(f"   ⚠️ Erreur avec {order}: {e}")
                continue
        
        if best_model is None:
            raise Exception("Aucun modèle ARIMA n'a pu être entraîné")
        
        print(f"\n   🏆 Meilleur ordre: {best_order}")
        print(f"   ✅ MAE:  {best_metrics['mae']:.2f} admissions")
        print(f"   ✅ RMSE: {best_metrics['rmse']:.2f}")
        print(f"   ✅ MAPE: {best_metrics['mape']:.2f}%")
        print(f"   ✅ R²:   {best_metrics['r2']:.4f}")
        
        self.results['ARIMA'] = {
            'metrics': best_metrics,
            'predictions': best_predictions,
            'actual': test_series,
            'model': best_model,
            'order': best_order
        }
        
        return best_model, best_metrics
    
    def create_ml_features(self, df):
        """Crée les features pour les modèles ML."""
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
        
        # Saisons
        df['is_winter'] = df['month'].isin([12, 1, 2]).astype(int)
        df['is_spring'] = df['month'].isin([3, 4, 5]).astype(int)
        df['is_summer'] = df['month'].isin([6, 7, 8]).astype(int)
        
        # Lags
        for lag in [1, 2, 3, 7, 14, 21, 28, 30]:
            df[f'lag_{lag}'] = df['admissions'].shift(lag)
        
        # Moyennes mobiles
        for window in [7, 14, 30]:
            df[f'ma_{window}'] = df['admissions'].rolling(window=window).mean()
            df[f'std_{window}'] = df['admissions'].rolling(window=window).std()
        
        # Tendances
        df['trend_7d'] = df['admissions'] - df['admissions'].shift(7)
        df['trend_30d'] = df['admissions'] - df['admissions'].shift(30)
        
        return df
    
    def train_random_forest(self, train_df, test_df):
        """Entraîne le modèle Random Forest."""
        print("\n" + "-" * 50)
        print("🌲 RANDOM FOREST")
        print("-" * 50)
        
        # Créer features
        df_full = pd.concat([train_df, test_df]).reset_index(drop=True)
        df_features = self.create_ml_features(df_full)
        df_features = df_features.dropna()
        
        # Features à utiliser
        feature_cols = [
            'day_of_week', 'day_of_month', 'month', 'quarter', 'week_of_year',
            'sin_day_week', 'cos_day_week', 'sin_month', 'cos_month',
            'is_weekend', 'is_monday', 'is_winter', 'is_spring', 'is_summer',
            'lag_1', 'lag_2', 'lag_3', 'lag_7', 'lag_14', 'lag_21', 'lag_28', 'lag_30',
            'ma_7', 'ma_14', 'ma_30', 'std_7', 'std_14', 'std_30',
            'trend_7d', 'trend_30d'
        ]
        
        # Split basé sur la date
        train_end_date = train_df['date'].max()
        train_mask = df_features['date'] <= train_end_date
        
        X_train = df_features.loc[train_mask, feature_cols]
        y_train = df_features.loc[train_mask, 'admissions']
        X_test = df_features.loc[~train_mask, feature_cols]
        y_test = df_features.loc[~train_mask, 'admissions']
        
        print(f"   Train: {len(X_train)} samples, Test: {len(X_test)} samples")
        
        # Entraînement avec hyperparamètres optimisés
        model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=42,
            n_jobs=-1
        )
        
        print("   ⏳ Entraînement...")
        model.fit(X_train, y_train)
        
        # Prédictions
        predictions = model.predict(X_test)
        actual = y_test.values
        
        metrics = self.calculate_metrics(actual, predictions, 'RandomForest')
        
        print(f"   ✅ MAE:  {metrics['mae']:.2f} admissions")
        print(f"   ✅ RMSE: {metrics['rmse']:.2f}")
        print(f"   ✅ MAPE: {metrics['mape']:.2f}%")
        print(f"   ✅ R²:   {metrics['r2']:.4f}")
        
        # Feature importance
        importance = dict(zip(feature_cols, model.feature_importances_))
        importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
        
        print("\n   📊 Top 5 features importantes:")
        for i, (feat, imp) in enumerate(list(importance.items())[:5]):
            print(f"      {i+1}. {feat}: {imp:.4f}")
        
        self.results['Random Forest'] = {
            'metrics': metrics,
            'predictions': predictions,
            'actual': actual,
            'model': model,
            'feature_importance': importance
        }
        
        return model, metrics
    
    def train_gradient_boosting(self, train_df, test_df):
        """Entraîne le modèle Gradient Boosting."""
        print("\n" + "-" * 50)
        print("🚀 GRADIENT BOOSTING")
        print("-" * 50)
        
        # Créer features
        df_full = pd.concat([train_df, test_df]).reset_index(drop=True)
        df_features = self.create_ml_features(df_full)
        df_features = df_features.dropna()
        
        # Features à utiliser
        feature_cols = [
            'day_of_week', 'day_of_month', 'month', 'quarter', 'week_of_year',
            'sin_day_week', 'cos_day_week', 'sin_month', 'cos_month',
            'is_weekend', 'is_monday', 'is_winter', 'is_spring', 'is_summer',
            'lag_1', 'lag_2', 'lag_3', 'lag_7', 'lag_14', 'lag_21', 'lag_28', 'lag_30',
            'ma_7', 'ma_14', 'ma_30', 'std_7', 'std_14', 'std_30',
            'trend_7d', 'trend_30d'
        ]
        
        # Split basé sur la date
        train_end_date = train_df['date'].max()
        train_mask = df_features['date'] <= train_end_date
        
        X_train = df_features.loc[train_mask, feature_cols]
        y_train = df_features.loc[train_mask, 'admissions']
        X_test = df_features.loc[~train_mask, feature_cols]
        y_test = df_features.loc[~train_mask, 'admissions']
        
        print(f"   Train: {len(X_train)} samples, Test: {len(X_test)} samples")
        
        # Entraînement avec hyperparamètres optimisés
        model = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=8,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=3,
            subsample=0.8,
            random_state=42
        )
        
        print("   ⏳ Entraînement...")
        model.fit(X_train, y_train)
        
        # Prédictions
        predictions = model.predict(X_test)
        actual = y_test.values
        
        metrics = self.calculate_metrics(actual, predictions, 'GradientBoosting')
        
        print(f"   ✅ MAE:  {metrics['mae']:.2f} admissions")
        print(f"   ✅ RMSE: {metrics['rmse']:.2f}")
        print(f"   ✅ MAPE: {metrics['mape']:.2f}%")
        print(f"   ✅ R²:   {metrics['r2']:.4f}")
        
        # Feature importance
        importance = dict(zip(feature_cols, model.feature_importances_))
        importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
        
        print("\n   📊 Top 5 features importantes:")
        for i, (feat, imp) in enumerate(list(importance.items())[:5]):
            print(f"      {i+1}. {feat}: {imp:.4f}")
        
        self.results['Gradient Boosting'] = {
            'metrics': metrics,
            'predictions': predictions,
            'actual': actual,
            'model': model,
            'feature_importance': importance
        }
        
        return model, metrics
    
    def run_comparison(self):
        """Exécute la comparaison complète."""
        # Charger les données
        self.load_and_prepare_data()
        
        # Split 80/20
        train_end = self.get_split_indices()
        
        train_df = self.df_daily.iloc[:train_end].copy()
        test_df = self.df_daily.iloc[train_end:].copy()
        
        # Entraîner tous les modèles
        self.train_prophet(train_df, test_df)
        self.train_arima(train_df, test_df)
        self.train_random_forest(train_df, test_df)
        self.train_gradient_boosting(train_df, test_df)
        
        # Afficher le tableau comparatif
        self.print_comparison_table()
        
        return self.results
    
    def print_comparison_table(self):
        """Affiche le tableau comparatif des modèles."""
        print("\n" + "=" * 80)
        print("📊 TABLEAU COMPARATIF DES MODÈLES (SPLIT 80/20)")
        print("=" * 80)
        
        print(f"\n{'Modèle':<20} {'MAE':>12} {'RMSE':>12} {'MAPE (%)':>12} {'R²':>12}")
        print("-" * 68)
        
        # Trouver les meilleurs scores
        best_mae = min(r['metrics']['mae'] for r in self.results.values())
        best_rmse = min(r['metrics']['rmse'] for r in self.results.values())
        best_mape = min(r['metrics']['mape'] for r in self.results.values())
        best_r2 = max(r['metrics']['r2'] for r in self.results.values())
        
        for model_name, result in self.results.items():
            m = result['metrics']
            
            mae_mark = " ⭐" if m['mae'] == best_mae else ""
            rmse_mark = " ⭐" if m['rmse'] == best_rmse else ""
            mape_mark = " ⭐" if m['mape'] == best_mape else ""
            r2_mark = " ⭐" if m['r2'] == best_r2 else ""
            
            print(f"{model_name:<20} {m['mae']:>10.2f}{mae_mark:2s} {m['rmse']:>10.2f}{rmse_mark:2s} "
                  f"{m['mape']:>10.2f}{mape_mark:2s} {m['r2']:>10.4f}{r2_mark:2s}")
        
        print("\n⭐ = Meilleur score pour cette métrique")
        
        # Recommandation
        print("\n" + "-" * 80)
        print("💡 RECOMMANDATION:")
        
        # Trouver le meilleur modèle global (basé sur R² et MAE)
        scores = {}
        for model, result in self.results.items():
            # Score combiné (R² élevé et MAE bas sont bons)
            score = result['metrics']['r2'] - (result['metrics']['mae'] / 100)
            scores[model] = score
        
        best_model = max(scores, key=scores.get)
        print(f"   Le modèle '{best_model}' offre le meilleur équilibre performance/précision")
        print(f"   avec R² = {self.results[best_model]['metrics']['r2']:.4f} et "
              f"MAE = {self.results[best_model]['metrics']['mae']:.2f} admissions/jour")
    
    def save_results(self, output_dir: str):
        """Sauvegarde les résultats."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Résultats de comparaison
        comparison_data = {
            'split': '80/20',
            'train_ratio': 0.80,
            'test_ratio': 0.20,
            'total_days': len(self.df_daily),
            'comparison_date': datetime.now().isoformat(),
            'models': {}
        }
        
        for model_name, result in self.results.items():
            comparison_data['models'][model_name] = {
                'metrics': {k: round(v, 4) for k, v in result['metrics'].items()}
            }
            
            # Ajouter les infos spécifiques
            if model_name == 'ARIMA' and 'order' in result:
                comparison_data['models'][model_name]['order'] = result['order']
            
            if 'feature_importance' in result:
                comparison_data['models'][model_name]['top_features'] = dict(
                    list(result['feature_importance'].items())[:10]
                )
        
        # Sauvegarder
        output_path = os.path.join(output_dir, 'model_comparison_80_20.json')
        with open(output_path, 'w') as f:
            json.dump(comparison_data, f, indent=2, default=str)
        
        print(f"\n💾 Résultats sauvegardés: {output_path}")
        
        # Sauvegarder les modèles
        models_dir = os.path.join(output_dir, 'models')
        os.makedirs(models_dir, exist_ok=True)
        
        for model_name, result in self.results.items():
            if 'model' in result and result['model'] is not None:
                model_filename = f"{model_name.lower().replace(' ', '_')}_80_20.pkl"
                model_path = os.path.join(models_dir, model_filename)
                joblib.dump(result['model'], model_path)
                print(f"   💾 Modèle {model_name}: {model_path}")
        
        return output_path


def main():
    """Point d'entrée principal."""
    # Chemins
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    data_path = os.path.join(data_dir, 'admissions_complet.csv')
    
    print("\n" + "=" * 80)
    print("🔬 COMPARAISON DES MODÈLES DE PRÉDICTION - SPLIT 80/20")
    print("=" * 80)
    print(f"\nDate: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Fichier de données: {data_path}")
    
    # Créer l'instance et lancer la comparaison
    comparison = ModelComparison80_20(data_path)
    results = comparison.run_comparison()
    
    # Sauvegarder les résultats
    comparison.save_results(data_dir)
    
    print("\n" + "=" * 80)
    print("✅ COMPARAISON TERMINÉE")
    print("=" * 80)


if __name__ == '__main__':
    main()
