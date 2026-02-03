"""
Modèles de prédiction par séries temporelles (ARIMA et Prophet)
===============================================================

Ce module implémente des modèles de prédiction des admissions hospitalières
à court terme (7 jours) et moyen terme (30 jours).
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import warnings
warnings.filterwarnings('ignore')

# Statsmodels pour ARIMA
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.seasonal import seasonal_decompose

# Scikit-learn pour métriques
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Joblib pour sauvegarder les modèles
import joblib


class TimeSeriesPredictor:
    """Classe pour les prédictions par séries temporelles."""
    
    def __init__(self, data_path: str):
        """Initialise le prédicteur avec les données."""
        self.data_path = data_path
        self.df = None
        self.model = None
        self.model_params = None
        self.metrics = {}
        
    def load_data(self):
        """Charge et prépare les données."""
        print("Chargement des données...")
        self.df = pd.read_csv(self.data_path)
        self.df['date'] = pd.to_datetime(self.df['date'])
        self.df = self.df.sort_values('date')
        self.df.set_index('date', inplace=True)
        
        print(f"Données chargées: {len(self.df)} jours")
        print(f"Période: {self.df.index.min()} à {self.df.index.max()}")
        
        return self.df
    
    def check_stationarity(self, series: pd.Series) -> dict:
        """Vérifie la stationnarité de la série avec le test ADF."""
        result = adfuller(series.dropna())
        return {
            'adf_statistic': result[0],
            'p_value': result[1],
            'is_stationary': result[1] < 0.05,
            'critical_values': result[4]
        }
    
    def decompose_series(self, column: str = 'admissions', period: int = 7):
        """Décompose la série en tendance, saisonnalité et résidu."""
        print(f"\nDécomposition de la série '{column}'...")
        
        decomposition = seasonal_decompose(
            self.df[column], 
            model='additive', 
            period=period
        )
        
        return {
            'trend': decomposition.trend,
            'seasonal': decomposition.seasonal,
            'residual': decomposition.resid,
            'observed': decomposition.observed
        }
    
    def train_arima(self, column: str = 'admissions', order: tuple = None, 
                    test_size: int = 60):
        """Entraîne un modèle ARIMA."""
        print(f"\nEntraînement du modèle ARIMA...")
        
        series = self.df[column]
        
        # Split train/test
        train = series[:-test_size]
        test = series[-test_size:]
        
        print(f"  Train: {len(train)} jours")
        print(f"  Test: {len(test)} jours")
        
        # Auto-sélection des paramètres si non spécifiés
        if order is None:
            # Paramètres par défaut basés sur données journalières avec saisonnalité
            order = (2, 1, 2)
        
        print(f"  Paramètres ARIMA: {order}")
        
        # Entraînement
        self.model = ARIMA(train, order=order)
        self.model_fit = self.model.fit()
        self.model_params = order
        
        # Prédictions sur test
        predictions = self.model_fit.forecast(steps=test_size)
        
        # Métriques
        self.metrics = {
            'mae': mean_absolute_error(test, predictions),
            'rmse': np.sqrt(mean_squared_error(test, predictions)),
            'mape': np.mean(np.abs((test - predictions) / test)) * 100,
            'r2': r2_score(test, predictions)
        }
        
        print(f"\nMétriques de performance:")
        print(f"  MAE: {self.metrics['mae']:.2f}")
        print(f"  RMSE: {self.metrics['rmse']:.2f}")
        print(f"  MAPE: {self.metrics['mape']:.2f}%")
        print(f"  R²: {self.metrics['r2']:.4f}")
        
        return {
            'model': self.model_fit,
            'predictions': predictions,
            'actual': test,
            'metrics': self.metrics
        }
    
    def predict_future(self, days: int = 30, confidence: float = 0.95):
        """Génère des prédictions futures avec intervalles de confiance."""
        if self.model_fit is None:
            raise ValueError("Le modèle doit d'abord être entraîné")
        
        print(f"\nGénération de prédictions pour {days} jours...")
        
        # Prédiction avec intervalle de confiance
        forecast = self.model_fit.get_forecast(steps=days)
        predictions = forecast.predicted_mean
        conf_int = forecast.conf_int(alpha=1-confidence)
        
        # Créer les dates futures
        last_date = self.df.index.max()
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days,
            freq='D'
        )
        
        results = pd.DataFrame({
            'date': future_dates,
            'prediction': predictions.values,
            'lower_bound': conf_int.iloc[:, 0].values,
            'upper_bound': conf_int.iloc[:, 1].values
        })
        
        # Assurer des valeurs positives
        results['prediction'] = results['prediction'].clip(lower=0)
        results['lower_bound'] = results['lower_bound'].clip(lower=0)
        
        return results
    
    def save_model(self, output_dir: str):
        """Sauvegarde le modèle et les métriques."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Sauvegarder le modèle
        model_path = os.path.join(output_dir, 'arima_model.pkl')
        joblib.dump(self.model_fit, model_path)
        print(f"Modèle sauvegardé: {model_path}")
        
        # Sauvegarder les métriques
        metrics_path = os.path.join(output_dir, 'arima_metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump({
                'model_type': 'ARIMA',
                'params': self.model_params,
                'metrics': self.metrics,
                'trained_at': datetime.now().isoformat()
            }, f, indent=2)
        print(f"Métriques sauvegardées: {metrics_path}")
        
        return model_path
    
    def generate_predictions_json(self, output_path: str, days: int = 30):
        """Génère un fichier JSON avec les prédictions pour l'API."""
        predictions = self.predict_future(days=days)
        
        # Convertir en format JSON-friendly
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
            'model': 'ARIMA',
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
        
        print(f"Prédictions JSON sauvegardées: {output_path}")
        return output


def analyze_seasonality(df: pd.DataFrame) -> dict:
    """Analyse la saisonnalité des données."""
    print("\nAnalyse de la saisonnalité...")
    
    # Par mois
    monthly = df.groupby(df.index.month)['admissions'].mean()
    seasonal_factors = (monthly / monthly.mean()).to_dict()
    
    # Par jour de la semaine
    weekly = df.groupby(df.index.dayofweek)['admissions'].mean()
    weekly_factors = (weekly / weekly.mean()).to_dict()
    
    day_names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                   'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    
    print("\nFacteurs saisonniers mensuels:")
    for month, factor in seasonal_factors.items():
        print(f"  {month_names[month-1]}: {factor:.2f}")
    
    print("\nFacteurs hebdomadaires:")
    for day, factor in weekly_factors.items():
        print(f"  {day_names[day]}: {factor:.2f}")
    
    return {
        'monthly_factors': seasonal_factors,
        'weekly_factors': weekly_factors
    }


def main():
    """Point d'entrée principal."""
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    models_dir = os.path.join(data_dir, 'models')
    
    # Initialiser le prédicteur
    predictor = TimeSeriesPredictor(
        os.path.join(data_dir, 'daily_stats.csv')
    )
    
    # Charger les données
    df = predictor.load_data()
    
    # Analyser la saisonnalité
    seasonality = analyze_seasonality(df)
    
    # Vérifier la stationnarité
    stationarity = predictor.check_stationarity(df['admissions'])
    print(f"\nTest de stationnarité ADF:")
    print(f"  Statistique: {stationarity['adf_statistic']:.4f}")
    print(f"  P-value: {stationarity['p_value']:.4f}")
    print(f"  Stationnaire: {stationarity['is_stationary']}")
    
    # Entraîner le modèle ARIMA
    results = predictor.train_arima(order=(2, 1, 2), test_size=60)
    
    # Sauvegarder le modèle
    predictor.save_model(models_dir)
    
    # Générer les prédictions JSON pour l'API
    predictor.generate_predictions_json(
        os.path.join(data_dir, 'predictions_arima.json'),
        days=30
    )
    
    # Sauvegarder l'analyse de saisonnalité
    seasonality_path = os.path.join(data_dir, 'seasonality_analysis.json')
    with open(seasonality_path, 'w') as f:
        json.dump(seasonality, f, indent=2)
    print(f"\nAnalyse saisonnalité sauvegardée: {seasonality_path}")
    
    # Générer les prédictions pour les 7 et 30 prochains jours
    short_term = predictor.predict_future(days=7)
    medium_term = predictor.predict_future(days=30)
    
    print("\n" + "="*60)
    print("PRÉDICTIONS COURT TERME (7 jours)")
    print("="*60)
    for _, row in short_term.iterrows():
        print(f"  {row['date'].strftime('%Y-%m-%d')}: {row['prediction']:.0f} "
              f"[{row['lower_bound']:.0f} - {row['upper_bound']:.0f}]")
    
    print("\n" + "="*60)
    print("PRÉDICTIONS MOYEN TERME (30 jours) - Résumé")
    print("="*60)
    print(f"  Moyenne: {medium_term['prediction'].mean():.0f} admissions/jour")
    print(f"  Min: {medium_term['prediction'].min():.0f}")
    print(f"  Max: {medium_term['prediction'].max():.0f}")


if __name__ == '__main__':
    main()
