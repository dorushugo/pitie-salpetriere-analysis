"""
Modèle Prophet pour les Prédictions d'Admissions Hospitalières
==============================================================

Prophet (Facebook) est un modèle de forecasting additif qui gère automatiquement :
- Tendance (linéaire ou logistique)
- Saisonnalité multiple (hebdomadaire, annuelle)
- Effets des jours fériés/événements spéciaux

Avantages par rapport à ARIMA :
- Pas besoin de tuning manuel des paramètres (p, d, q)
- Gère les données manquantes
- Robuste aux outliers
- Interprétable (décomposition visible)
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
from prophet.diagnostics import cross_validation, performance_metrics

# Métriques
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import joblib


class ProphetPredictor:
    """Classe pour les prédictions avec Prophet."""
    
    def __init__(self, data_path: str):
        """Initialise le prédicteur avec les données."""
        self.data_path = data_path
        self.df = None
        self.df_prophet = None
        self.model = None
        self.forecast = None
        self.metrics = {}
        
    def load_data(self):
        """Charge et prépare les données au format Prophet."""
        print("📂 Chargement des données...")
        
        # Charger les données
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
        
        # Agréger par jour si nécessaire (admissions)
        if 'admissions' not in self.df.columns and 'nb_admissions' not in self.df.columns:
            # C'est probablement le fichier admissions_complet.csv
            daily = self.df.groupby('date').size().reset_index(name='admissions')
            self.df = daily
        elif 'nb_admissions' in self.df.columns:
            self.df['admissions'] = self.df['nb_admissions']
        
        self.df = self.df.sort_values('date')
        
        # Format Prophet: ds (date) et y (valeur)
        self.df_prophet = pd.DataFrame({
            'ds': self.df['date'],
            'y': self.df['admissions']
        })
        
        print(f"   ✅ {len(self.df_prophet)} jours chargés")
        print(f"   📅 Période: {self.df_prophet['ds'].min().date()} → {self.df_prophet['ds'].max().date()}")
        print(f"   📊 Admissions moyennes: {self.df_prophet['y'].mean():.0f}/jour")
        
        return self.df_prophet
    
    def add_french_holidays(self):
        """Ajoute les jours fériés français au modèle."""
        holidays = pd.DataFrame({
            'holiday': 'jour_ferie',
            'ds': pd.to_datetime([
                # 2020
                '2020-01-01', '2020-04-13', '2020-05-01', '2020-05-08', 
                '2020-05-21', '2020-06-01', '2020-07-14', '2020-08-15',
                '2020-11-01', '2020-11-11', '2020-12-25',
                # 2021
                '2021-01-01', '2021-04-05', '2021-05-01', '2021-05-08',
                '2021-05-13', '2021-05-24', '2021-07-14', '2021-08-15',
                '2021-11-01', '2021-11-11', '2021-12-25',
                # 2022
                '2022-01-01', '2022-04-18', '2022-05-01', '2022-05-08',
                '2022-05-26', '2022-06-06', '2022-07-14', '2022-08-15',
                '2022-11-01', '2022-11-11', '2022-12-25',
                # 2023
                '2023-01-01', '2023-04-10', '2023-05-01', '2023-05-08',
                '2023-05-18', '2023-05-29', '2023-07-14', '2023-08-15',
                '2023-11-01', '2023-11-11', '2023-12-25',
                # 2024
                '2024-01-01', '2024-04-01', '2024-05-01', '2024-05-08',
                '2024-05-09', '2024-05-20', '2024-07-14', '2024-08-15',
                '2024-11-01', '2024-11-11', '2024-12-25',
                # 2025
                '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08',
                '2025-05-29', '2025-06-09', '2025-07-14', '2025-08-15',
                '2025-11-01', '2025-11-11', '2025-12-25',
                # 2026
                '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08',
                '2026-05-14', '2026-05-25', '2026-07-14', '2026-08-15',
                '2026-11-01', '2026-11-11', '2026-12-25',
            ]),
            'lower_window': -1,  # Effet commence 1 jour avant
            'upper_window': 1,   # Effet dure 1 jour après
        })
        return holidays
    
    def train(self, test_size: int = 60, 
              yearly_seasonality: bool = True,
              weekly_seasonality: bool = True,
              daily_seasonality: bool = False,
              changepoint_prior_scale: float = 0.05):
        """
        Entraîne le modèle Prophet.
        
        Args:
            test_size: Nombre de jours pour le test
            yearly_seasonality: Activer la saisonnalité annuelle
            weekly_seasonality: Activer la saisonnalité hebdomadaire
            daily_seasonality: Activer la saisonnalité journalière
            changepoint_prior_scale: Flexibilité de la tendance (0.001 à 0.5)
        """
        print("\n🔮 Entraînement du modèle Prophet...")
        
        # Split train/test
        train_df = self.df_prophet.iloc[:-test_size]
        test_df = self.df_prophet.iloc[-test_size:]
        
        print(f"   Train: {len(train_df)} jours")
        print(f"   Test: {len(test_df)} jours")
        
        # Créer le modèle Prophet
        self.model = Prophet(
            yearly_seasonality=yearly_seasonality,
            weekly_seasonality=weekly_seasonality,
            daily_seasonality=daily_seasonality,
            changepoint_prior_scale=changepoint_prior_scale,
            seasonality_mode='additive',  # ou 'multiplicative'
            interval_width=0.95,  # Intervalle de confiance 95%
            holidays=self.add_french_holidays(),
        )
        
        # Ajouter une saisonnalité mensuelle personnalisée
        self.model.add_seasonality(
            name='monthly',
            period=30.5,
            fourier_order=5
        )
        
        # Entraîner
        print("   ⏳ Fitting du modèle...")
        self.model.fit(train_df)
        print("   ✅ Modèle entraîné")
        
        # Prédictions sur la période de test
        future_test = self.model.make_future_dataframe(periods=test_size)
        forecast_test = self.model.predict(future_test)
        
        # Extraire les prédictions pour la période de test
        predictions = forecast_test.iloc[-test_size:]['yhat'].values
        actual = test_df['y'].values
        
        # Calculer les métriques
        self.metrics = {
            'mae': mean_absolute_error(actual, predictions),
            'rmse': np.sqrt(mean_squared_error(actual, predictions)),
            'mape': np.mean(np.abs((actual - predictions) / actual)) * 100,
            'r2': r2_score(actual, predictions),
        }
        
        print(f"\n📊 Métriques de performance (Test):")
        print(f"   MAE:  {self.metrics['mae']:.2f} admissions")
        print(f"   RMSE: {self.metrics['rmse']:.2f}")
        print(f"   MAPE: {self.metrics['mape']:.2f}%")
        print(f"   R²:   {self.metrics['r2']:.4f}")
        
        return {
            'model': self.model,
            'predictions': predictions,
            'actual': actual,
            'metrics': self.metrics,
        }
    
    def cross_validate(self, initial: str = '365 days', 
                       period: str = '30 days', 
                       horizon: str = '30 days'):
        """
        Effectue une validation croisée temporelle.
        
        Args:
            initial: Période initiale d'entraînement
            period: Intervalle entre les cutoffs
            horizon: Horizon de prédiction
        """
        print(f"\n🔄 Validation croisée (horizon={horizon})...")
        
        df_cv = cross_validation(
            self.model, 
            initial=initial, 
            period=period, 
            horizon=horizon
        )
        
        df_metrics = performance_metrics(df_cv)
        
        print(f"\n📊 Métriques CV:")
        print(f"   MAE:  {df_metrics['mae'].mean():.2f} (+/- {df_metrics['mae'].std():.2f})")
        print(f"   RMSE: {df_metrics['rmse'].mean():.2f}")
        print(f"   MAPE: {df_metrics['mape'].mean()*100:.2f}%")
        
        return df_cv, df_metrics
    
    def predict_future(self, days: int = 30):
        """
        Génère des prédictions futures.
        
        Args:
            days: Nombre de jours à prédire
        
        Returns:
            DataFrame avec les prédictions
        """
        print(f"\n🔮 Génération de prédictions pour {days} jours...")
        
        # Créer les dates futures
        future = self.model.make_future_dataframe(periods=days)
        
        # Prédire
        self.forecast = self.model.predict(future)
        
        # Extraire les prédictions futures uniquement
        future_predictions = self.forecast.iloc[-days:][['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
        future_predictions.columns = ['date', 'prediction', 'lower_bound', 'upper_bound']
        
        # Assurer des valeurs positives
        future_predictions['prediction'] = future_predictions['prediction'].clip(lower=0)
        future_predictions['lower_bound'] = future_predictions['lower_bound'].clip(lower=0)
        
        return future_predictions
    
    def get_components(self):
        """Retourne les composantes du modèle (tendance, saisonnalité)."""
        if self.forecast is None:
            raise ValueError("Le modèle doit d'abord faire des prédictions")
        
        components = {
            'trend': self.forecast[['ds', 'trend']].copy(),
            'weekly': self.forecast[['ds', 'weekly']].copy() if 'weekly' in self.forecast.columns else None,
            'yearly': self.forecast[['ds', 'yearly']].copy() if 'yearly' in self.forecast.columns else None,
            'monthly': self.forecast[['ds', 'monthly']].copy() if 'monthly' in self.forecast.columns else None,
        }
        
        return components
    
    def save_model(self, output_dir: str):
        """Sauvegarde le modèle et les métriques."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Sauvegarder le modèle avec joblib (Prophet supporte la sérialisation JSON aussi)
        model_path = os.path.join(output_dir, 'prophet_model.pkl')
        joblib.dump(self.model, model_path)
        print(f"   💾 Modèle sauvegardé: {model_path}")
        
        # Sauvegarder les métriques
        metrics_path = os.path.join(output_dir, 'prophet_metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump({
                'model_type': 'Prophet',
                'metrics': self.metrics,
                'trained_at': datetime.now().isoformat(),
            }, f, indent=2)
        print(f"   💾 Métriques sauvegardées: {metrics_path}")
        
        return model_path
    
    def generate_predictions_json(self, output_path: str, days: int = 30):
        """Génère un fichier JSON avec les prédictions pour l'API."""
        predictions = self.predict_future(days=days)
        
        predictions_list = []
        for _, row in predictions.iterrows():
            predictions_list.append({
                'date': row['date'].strftime('%Y-%m-%d'),
                'predicted_admissions': round(row['prediction']),
                'lower_bound': round(row['lower_bound']),
                'upper_bound': round(row['upper_bound']),
                'confidence': 0.95
            })
        
        output = {
            'model': 'Prophet',
            'generated_at': datetime.now().isoformat(),
            'metrics': {
                'mae': round(self.metrics['mae'], 2),
                'rmse': round(self.metrics['rmse'], 2),
                'mape': round(self.metrics['mape'], 2),
                'r2': round(self.metrics['r2'], 4)
            },
            'predictions': predictions_list
        }
        
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"   💾 Prédictions JSON sauvegardées: {output_path}")
        return output


def compare_models(data_path: str, test_size: int = 60):
    """
    Compare Prophet avec les autres modèles (ARIMA, Random Forest).
    """
    print("\n" + "="*70)
    print("🔬 COMPARAISON DES MODÈLES DE PRÉDICTION")
    print("="*70)
    
    results = {}
    
    # 1. Prophet
    print("\n" + "-"*40)
    print("📈 PROPHET")
    print("-"*40)
    
    prophet_predictor = ProphetPredictor(data_path)
    prophet_predictor.load_data()
    prophet_results = prophet_predictor.train(test_size=test_size)
    results['Prophet'] = prophet_results['metrics']
    
    # 2. ARIMA (si disponible)
    try:
        from statsmodels.tsa.arima.model import ARIMA
        print("\n" + "-"*40)
        print("📈 ARIMA")
        print("-"*40)
        
        df = prophet_predictor.df_prophet.copy()
        train = df['y'].iloc[:-test_size]
        test = df['y'].iloc[-test_size:]
        
        model = ARIMA(train, order=(2, 1, 2))
        model_fit = model.fit()
        predictions = model_fit.forecast(steps=test_size)
        
        arima_metrics = {
            'mae': mean_absolute_error(test, predictions),
            'rmse': np.sqrt(mean_squared_error(test, predictions)),
            'mape': np.mean(np.abs((test - predictions) / test)) * 100,
            'r2': r2_score(test, predictions),
        }
        results['ARIMA'] = arima_metrics
        
        print(f"   MAE:  {arima_metrics['mae']:.2f}")
        print(f"   RMSE: {arima_metrics['rmse']:.2f}")
        print(f"   MAPE: {arima_metrics['mape']:.2f}%")
        print(f"   R²:   {arima_metrics['r2']:.4f}")
        
    except Exception as e:
        print(f"   ⚠️ ARIMA non disponible: {e}")
    
    # 3. Random Forest
    try:
        from sklearn.ensemble import RandomForestRegressor
        print("\n" + "-"*40)
        print("📈 RANDOM FOREST")
        print("-"*40)
        
        df = prophet_predictor.df_prophet.copy()
        df['day_of_week'] = df['ds'].dt.dayofweek
        df['day_of_month'] = df['ds'].dt.day
        df['month'] = df['ds'].dt.month
        df['week_of_year'] = df['ds'].dt.isocalendar().week.astype(int)
        
        # Lags
        for lag in [1, 7, 14, 30]:
            df[f'lag_{lag}'] = df['y'].shift(lag)
        
        # Moving averages
        df['ma_7'] = df['y'].rolling(7).mean()
        df['ma_30'] = df['y'].rolling(30).mean()
        
        df = df.dropna()
        
        features = ['day_of_week', 'day_of_month', 'month', 'week_of_year',
                    'lag_1', 'lag_7', 'lag_14', 'lag_30', 'ma_7', 'ma_30']
        
        X = df[features]
        y = df['y']
        
        X_train, X_test = X.iloc[:-test_size], X.iloc[-test_size:]
        y_train, y_test = y.iloc[:-test_size], y.iloc[-test_size:]
        
        rf_model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42)
        rf_model.fit(X_train, y_train)
        predictions = rf_model.predict(X_test)
        
        rf_metrics = {
            'mae': mean_absolute_error(y_test, predictions),
            'rmse': np.sqrt(mean_squared_error(y_test, predictions)),
            'mape': np.mean(np.abs((y_test - predictions) / y_test)) * 100,
            'r2': r2_score(y_test, predictions),
        }
        results['RandomForest'] = rf_metrics
        
        print(f"   MAE:  {rf_metrics['mae']:.2f}")
        print(f"   RMSE: {rf_metrics['rmse']:.2f}")
        print(f"   MAPE: {rf_metrics['mape']:.2f}%")
        print(f"   R²:   {rf_metrics['r2']:.4f}")
        
    except Exception as e:
        print(f"   ⚠️ Random Forest erreur: {e}")
    
    # Tableau comparatif
    print("\n" + "="*70)
    print("📊 TABLEAU COMPARATIF")
    print("="*70)
    print(f"\n{'Modèle':<15} {'MAE':>10} {'RMSE':>10} {'MAPE':>10} {'R²':>10}")
    print("-"*55)
    
    best_mae = min(r['mae'] for r in results.values())
    best_r2 = max(r['r2'] for r in results.values())
    
    for model, metrics in results.items():
        mae_marker = " ⭐" if metrics['mae'] == best_mae else ""
        r2_marker = " ⭐" if metrics['r2'] == best_r2 else ""
        print(f"{model:<15} {metrics['mae']:>10.2f}{mae_marker:3s} {metrics['rmse']:>10.2f} "
              f"{metrics['mape']:>9.2f}% {metrics['r2']:>10.4f}{r2_marker}")
    
    print("\n⭐ = Meilleur score")
    
    return results


def main():
    """Point d'entrée principal."""
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    models_dir = os.path.join(data_dir, 'models')
    
    # Utiliser le fichier etablissement.csv qui a les admissions par jour
    data_path = os.path.join(data_dir, 'etablissement.csv')
    
    # Comparaison des modèles
    results = compare_models(data_path, test_size=60)
    
    # Entraîner Prophet sur toutes les données et générer les prédictions
    print("\n" + "="*70)
    print("🔮 GÉNÉRATION DES PRÉDICTIONS FINALES AVEC PROPHET")
    print("="*70)
    
    predictor = ProphetPredictor(data_path)
    predictor.load_data()
    predictor.train(test_size=30)  # Moins de test pour plus de données d'entraînement
    
    # Sauvegarder
    predictor.save_model(models_dir)
    
    # Générer les prédictions JSON
    predictor.generate_predictions_json(
        os.path.join(data_dir, 'predictions_prophet.json'),
        days=30
    )
    
    # Afficher quelques prédictions
    predictions = predictor.predict_future(days=7)
    print("\n📅 Prédictions pour les 7 prochains jours:")
    for _, row in predictions.iterrows():
        print(f"   {row['date'].strftime('%Y-%m-%d')}: {row['prediction']:.0f} "
              f"[{row['lower_bound']:.0f} - {row['upper_bound']:.0f}]")
    
    # Sauvegarder les résultats de comparaison
    comparison_path = os.path.join(data_dir, 'model_comparison.json')
    with open(comparison_path, 'w') as f:
        json.dump({
            'comparison_date': datetime.now().isoformat(),
            'test_size': 60,
            'results': results
        }, f, indent=2)
    print(f"\n💾 Comparaison sauvegardée: {comparison_path}")


if __name__ == '__main__':
    main()
