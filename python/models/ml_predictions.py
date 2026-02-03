"""
Modèles de prédiction par Machine Learning (Random Forest / XGBoost)
====================================================================

Ce module implémente des modèles de prédiction des admissions hospitalières
utilisant des algorithmes d'apprentissage automatique avec feature engineering.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib


class MLPredictor:
    """Classe pour les prédictions par Machine Learning."""
    
    def __init__(self, data_path: str):
        """Initialise le prédicteur avec les données."""
        self.data_path = data_path
        self.df = None
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self.metrics = {}
        self.feature_importance = {}
        
    def load_data(self):
        """Charge et prépare les données."""
        print("Chargement des données...")
        self.df = pd.read_csv(self.data_path)
        self.df['date'] = pd.to_datetime(self.df['date'])
        self.df = self.df.sort_values('date')
        
        print(f"Données chargées: {len(self.df)} jours")
        return self.df
    
    def create_features(self, df: pd.DataFrame = None) -> pd.DataFrame:
        """Crée les features pour le modèle ML."""
        if df is None:
            df = self.df.copy()
        else:
            df = df.copy()
        
        # Features temporelles
        df['jour_semaine'] = df['date'].dt.dayofweek
        df['jour_mois'] = df['date'].dt.day
        df['mois'] = df['date'].dt.month
        df['trimestre'] = df['date'].dt.quarter
        df['annee'] = df['date'].dt.year
        df['semaine_annee'] = df['date'].dt.isocalendar().week.astype(int)
        
        # Features cycliques (pour capturer la périodicité)
        df['sin_jour_semaine'] = np.sin(2 * np.pi * df['jour_semaine'] / 7)
        df['cos_jour_semaine'] = np.cos(2 * np.pi * df['jour_semaine'] / 7)
        df['sin_mois'] = np.sin(2 * np.pi * df['mois'] / 12)
        df['cos_mois'] = np.cos(2 * np.pi * df['mois'] / 12)
        df['sin_jour_mois'] = np.sin(2 * np.pi * df['jour_mois'] / 31)
        df['cos_jour_mois'] = np.cos(2 * np.pi * df['jour_mois'] / 31)
        
        # Features binaires
        df['est_weekend'] = (df['jour_semaine'] >= 5).astype(int)
        df['est_lundi'] = (df['jour_semaine'] == 0).astype(int)
        
        # Saisons
        df['est_hiver'] = df['mois'].isin([12, 1, 2]).astype(int)
        df['est_printemps'] = df['mois'].isin([3, 4, 5]).astype(int)
        df['est_ete'] = df['mois'].isin([6, 7, 8]).astype(int)
        df['est_automne'] = df['mois'].isin([9, 10, 11]).astype(int)
        
        # Features de lag (historique)
        for lag in [1, 2, 3, 7, 14, 30]:
            df[f'admissions_lag_{lag}'] = df['admissions'].shift(lag)
        
        # Moyennes mobiles
        for window in [7, 14, 30]:
            df[f'admissions_ma_{window}'] = df['admissions'].rolling(window=window).mean()
            df[f'admissions_std_{window}'] = df['admissions'].rolling(window=window).std()
        
        # Tendance (différence par rapport à la semaine précédente)
        df['tendance_7j'] = df['admissions'] - df['admissions'].shift(7)
        
        # Supprimer les lignes avec des NaN (début de série)
        df = df.dropna()
        
        return df
    
    def prepare_data(self, test_size: int = 60):
        """Prépare les données pour l'entraînement."""
        print("\nCréation des features...")
        
        df = self.create_features()
        
        # Définir les features
        self.feature_names = [
            'jour_semaine', 'jour_mois', 'mois', 'trimestre', 'semaine_annee',
            'sin_jour_semaine', 'cos_jour_semaine', 'sin_mois', 'cos_mois',
            'sin_jour_mois', 'cos_jour_mois',
            'est_weekend', 'est_lundi', 'est_hiver', 'est_printemps', 'est_ete', 'est_automne',
            'admissions_lag_1', 'admissions_lag_2', 'admissions_lag_3', 
            'admissions_lag_7', 'admissions_lag_14', 'admissions_lag_30',
            'admissions_ma_7', 'admissions_ma_14', 'admissions_ma_30',
            'admissions_std_7', 'admissions_std_14', 'admissions_std_30',
            'tendance_7j'
        ]
        
        X = df[self.feature_names]
        y = df['admissions']
        dates = df['date']
        
        # Split temporel (pas aléatoire pour séries temporelles)
        X_train = X.iloc[:-test_size]
        X_test = X.iloc[-test_size:]
        y_train = y.iloc[:-test_size]
        y_test = y.iloc[-test_size:]
        dates_test = dates.iloc[-test_size:]
        
        print(f"Features créées: {len(self.feature_names)}")
        print(f"Train: {len(X_train)} samples")
        print(f"Test: {len(X_test)} samples")
        
        return X_train, X_test, y_train, y_test, dates_test, df
    
    def train_random_forest(self, X_train, y_train, X_test, y_test):
        """Entraîne un modèle Random Forest."""
        print("\nEntraînement Random Forest...")
        
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train, y_train)
        
        # Prédictions
        y_pred_train = self.model.predict(X_train)
        y_pred_test = self.model.predict(X_test)
        
        # Métriques
        self.metrics = {
            'train': {
                'mae': mean_absolute_error(y_train, y_pred_train),
                'rmse': np.sqrt(mean_squared_error(y_train, y_pred_train)),
                'r2': r2_score(y_train, y_pred_train)
            },
            'test': {
                'mae': mean_absolute_error(y_test, y_pred_test),
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred_test)),
                'mape': np.mean(np.abs((y_test - y_pred_test) / y_test)) * 100,
                'r2': r2_score(y_test, y_pred_test)
            }
        }
        
        # Feature importance
        importance = self.model.feature_importances_
        self.feature_importance = dict(zip(self.feature_names, importance))
        self.feature_importance = dict(sorted(
            self.feature_importance.items(), 
            key=lambda x: x[1], 
            reverse=True
        ))
        
        print("\nMétriques de performance (Test):")
        print(f"  MAE: {self.metrics['test']['mae']:.2f}")
        print(f"  RMSE: {self.metrics['test']['rmse']:.2f}")
        print(f"  MAPE: {self.metrics['test']['mape']:.2f}%")
        print(f"  R²: {self.metrics['test']['r2']:.4f}")
        
        print("\nTop 10 features les plus importantes:")
        for i, (feat, imp) in enumerate(list(self.feature_importance.items())[:10]):
            print(f"  {i+1}. {feat}: {imp:.4f}")
        
        return y_pred_test
    
    def cross_validate(self, X, y, n_splits: int = 5):
        """Effectue une validation croisée temporelle."""
        print(f"\nValidation croisée temporelle ({n_splits} folds)...")
        
        tscv = TimeSeriesSplit(n_splits=n_splits)
        
        scores = cross_val_score(
            self.model, X, y, 
            cv=tscv, 
            scoring='neg_mean_absolute_error'
        )
        
        print(f"  MAE par fold: {-scores}")
        print(f"  MAE moyenne: {-scores.mean():.2f} (+/- {scores.std():.2f})")
        
        return -scores
    
    def predict_future(self, df: pd.DataFrame, days: int = 30):
        """Génère des prédictions futures."""
        print(f"\nGénération de prédictions pour {days} jours...")
        
        # Copier le DataFrame avec toutes les données
        df_extended = df.copy()
        
        predictions = []
        last_date = df_extended['date'].max()
        
        for i in range(days):
            future_date = last_date + timedelta(days=i+1)
            
            # Créer une nouvelle ligne
            new_row = {
                'date': future_date,
                'admissions': np.nan  # Placeholder
            }
            
            # Ajouter au DataFrame
            df_extended = pd.concat([
                df_extended, 
                pd.DataFrame([new_row])
            ], ignore_index=True)
            
            # Recréer les features
            df_features = self.create_features(df_extended)
            
            # Obtenir la dernière ligne
            last_features = df_features[self.feature_names].iloc[-1:].fillna(0)
            
            # Prédire
            pred = self.model.predict(last_features)[0]
            pred = max(0, pred)  # Assurer valeur positive
            
            # Mettre à jour la valeur
            df_extended.loc[df_extended['date'] == future_date, 'admissions'] = pred
            
            predictions.append({
                'date': future_date,
                'prediction': pred
            })
        
        return pd.DataFrame(predictions)
    
    def calculate_confidence_intervals(self, predictions: pd.DataFrame, 
                                        error_margin: float = None):
        """Calcule les intervalles de confiance basés sur l'erreur du modèle."""
        if error_margin is None:
            error_margin = self.metrics['test']['rmse'] * 1.96  # 95% CI
        
        predictions['lower_bound'] = (predictions['prediction'] - error_margin).clip(lower=0)
        predictions['upper_bound'] = predictions['prediction'] + error_margin
        
        return predictions
    
    def save_model(self, output_dir: str):
        """Sauvegarde le modèle et les métriques."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Sauvegarder le modèle
        model_path = os.path.join(output_dir, 'rf_model.pkl')
        joblib.dump(self.model, model_path)
        print(f"Modèle sauvegardé: {model_path}")
        
        # Sauvegarder les métriques
        metrics_path = os.path.join(output_dir, 'rf_metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump({
                'model_type': 'RandomForest',
                'n_features': len(self.feature_names),
                'feature_names': self.feature_names,
                'metrics': self.metrics,
                'feature_importance': {k: round(v, 4) for k, v in 
                                       list(self.feature_importance.items())[:15]},
                'trained_at': datetime.now().isoformat()
            }, f, indent=2)
        print(f"Métriques sauvegardées: {metrics_path}")
        
        return model_path
    
    def generate_predictions_json(self, output_path: str, predictions: pd.DataFrame):
        """Génère un fichier JSON avec les prédictions pour l'API."""
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
            'model': 'RandomForest',
            'generated_at': datetime.now().isoformat(),
            'metrics': {
                'mae': round(self.metrics['test']['mae'], 2),
                'rmse': round(self.metrics['test']['rmse'], 2),
                'mape': round(self.metrics['test']['mape'], 2),
                'r2': round(self.metrics['test']['r2'], 4)
            },
            'feature_importance': {k: round(v, 4) for k, v in 
                                   list(self.feature_importance.items())[:10]},
            'predictions': predictions_list
        }
        
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"Prédictions JSON sauvegardées: {output_path}")
        return output


def generate_combined_predictions(data_dir: str):
    """Génère un fichier de prédictions combinant les deux modèles."""
    print("\nGénération des prédictions combinées...")
    
    arima_path = os.path.join(data_dir, 'predictions_arima.json')
    rf_path = os.path.join(data_dir, 'predictions_rf.json')
    
    with open(arima_path, 'r') as f:
        arima_data = json.load(f)
    
    with open(rf_path, 'r') as f:
        rf_data = json.load(f)
    
    # Combiner les prédictions (moyenne pondérée basée sur les métriques)
    # Pondérer plus le modèle avec le meilleur R²
    arima_weight = max(0.3, arima_data['metrics']['r2'])
    rf_weight = max(0.3, rf_data['metrics']['r2'])
    total_weight = arima_weight + rf_weight
    arima_weight /= total_weight
    rf_weight /= total_weight
    
    combined_predictions = []
    for arima_pred, rf_pred in zip(arima_data['predictions'], rf_data['predictions']):
        combined = {
            'date': arima_pred['date'],
            'arima_prediction': arima_pred['predicted_admissions'],
            'rf_prediction': rf_pred['predicted_admissions'],
            'ensemble_prediction': round(
                arima_weight * arima_pred['predicted_admissions'] + 
                rf_weight * rf_pred['predicted_admissions']
            ),
            'lower_bound': min(arima_pred['lower_bound'], rf_pred['lower_bound']),
            'upper_bound': max(arima_pred['upper_bound'], rf_pred['upper_bound']),
            'confidence': 0.95
        }
        combined_predictions.append(combined)
    
    output = {
        'models': ['ARIMA', 'RandomForest'],
        'weights': {
            'arima': round(arima_weight, 3),
            'random_forest': round(rf_weight, 3)
        },
        'generated_at': datetime.now().isoformat(),
        'metrics': {
            'arima': arima_data['metrics'],
            'random_forest': rf_data['metrics']
        },
        'predictions': combined_predictions
    }
    
    output_path = os.path.join(data_dir, 'predictions_ensemble.json')
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Prédictions ensemble sauvegardées: {output_path}")
    return output


def main():
    """Point d'entrée principal."""
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    models_dir = os.path.join(data_dir, 'models')
    
    # Initialiser le prédicteur
    predictor = MLPredictor(os.path.join(data_dir, 'daily_stats.csv'))
    
    # Charger les données
    predictor.load_data()
    
    # Préparer les données
    X_train, X_test, y_train, y_test, dates_test, df_features = predictor.prepare_data(test_size=60)
    
    # Entraîner le modèle
    y_pred = predictor.train_random_forest(X_train, y_train, X_test, y_test)
    
    # Validation croisée
    X_all = pd.concat([X_train, X_test])
    y_all = pd.concat([y_train, y_test])
    cv_scores = predictor.cross_validate(X_all, y_all)
    
    # Sauvegarder le modèle
    predictor.save_model(models_dir)
    
    # Générer les prédictions futures
    predictions = predictor.predict_future(predictor.df, days=30)
    predictions = predictor.calculate_confidence_intervals(predictions)
    
    # Sauvegarder les prédictions
    predictor.generate_predictions_json(
        os.path.join(data_dir, 'predictions_rf.json'),
        predictions
    )
    
    # Générer les prédictions combinées (ensemble)
    generate_combined_predictions(data_dir)
    
    # Afficher les résultats
    print("\n" + "="*60)
    print("PRÉDICTIONS COURT TERME (7 jours)")
    print("="*60)
    for _, row in predictions.head(7).iterrows():
        print(f"  {row['date'].strftime('%Y-%m-%d')}: {row['prediction']:.0f} "
              f"[{row['lower_bound']:.0f} - {row['upper_bound']:.0f}]")
    
    print("\n" + "="*60)
    print("COMPARAISON PRÉDICTIONS vs RÉALITÉ (derniers 10 jours de test)")
    print("="*60)
    comparison = pd.DataFrame({
        'date': dates_test[-10:].values,
        'réel': y_test[-10:].values,
        'prédit': y_pred[-10:].round()
    })
    comparison['erreur'] = abs(comparison['réel'] - comparison['prédit'])
    print(comparison.to_string(index=False))


if __name__ == '__main__':
    main()
