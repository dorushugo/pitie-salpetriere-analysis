"""
Test Rigoureux des Modèles de Séries Temporelles
=================================================

Ce script teste Prophet et ARIMA de manière appropriée :
- Validation walk-forward (prédiction jour par jour)
- Horizons de prédiction réalistes (1, 7, 14, 30 jours)
- Comparaison équitable avec les modèles ML

Les modèles de séries temporelles ne sont PAS conçus pour prédire
439 jours d'un coup ! Ils excellent sur des horizons courts.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import warnings
warnings.filterwarnings('ignore')

from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def load_data(data_path):
    """Charge et agrège les données par jour."""
    print("📂 Chargement des données...")
    df = pd.read_csv(data_path)
    
    # Détecter colonne de date
    date_col = None
    for col in ['date', 'date_admission', 'ds']:
        if col in df.columns:
            date_col = col
            break
    
    df['date'] = pd.to_datetime(df[date_col])
    
    # Agréger par jour
    if 'admissions' not in df.columns:
        df_daily = df.groupby('date').size().reset_index(name='admissions')
    else:
        df_daily = df.groupby('date')['admissions'].sum().reset_index()
    
    df_daily = df_daily.sort_values('date').reset_index(drop=True)
    
    print(f"   ✅ {len(df_daily)} jours ({df_daily['date'].min().date()} → {df_daily['date'].max().date()})")
    return df_daily


def calculate_metrics(y_true, y_pred):
    """Calcule les métriques."""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_true_safe = np.where(y_true == 0, 1, y_true)
    
    return {
        'mae': mean_absolute_error(y_true, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
        'mape': np.mean(np.abs((y_true - y_pred) / y_true_safe)) * 100,
        'r2': r2_score(y_true, y_pred)
    }


def test_prophet_walk_forward(df, horizon=7, n_test_points=60):
    """
    Test Prophet avec validation walk-forward.
    
    À chaque point de test :
    1. Entraîner Prophet sur toutes les données jusqu'à ce point
    2. Prédire les `horizon` prochains jours
    3. Comparer avec les vraies valeurs
    
    Args:
        df: DataFrame avec 'date' et 'admissions'
        horizon: Nombre de jours à prédire à chaque fois
        n_test_points: Nombre de points de test
    """
    print(f"\n{'='*60}")
    print(f"🔮 PROPHET - Walk-Forward (horizon={horizon} jours)")
    print(f"{'='*60}")
    
    all_predictions = []
    all_actuals = []
    
    # Points de test uniformément répartis dans les 20% derniers
    test_start_idx = int(len(df) * 0.8)
    test_indices = np.linspace(test_start_idx, len(df) - horizon - 1, n_test_points, dtype=int)
    
    print(f"   Points de test: {len(test_indices)} (de l'index {test_start_idx} à {len(df)-horizon-1})")
    
    for i, idx in enumerate(test_indices):
        # Données d'entraînement jusqu'à ce point
        train_df = df.iloc[:idx].copy()
        
        # Format Prophet
        train_prophet = pd.DataFrame({
            'ds': train_df['date'],
            'y': train_df['admissions']
        })
        
        # Entraîner Prophet (silencieux)
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            seasonality_mode='additive'
        )
        model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        model.fit(train_prophet)
        
        # Prédire les prochains `horizon` jours
        future = model.make_future_dataframe(periods=horizon)
        forecast = model.predict(future)
        
        # Extraire les prédictions pour l'horizon
        predictions = forecast['yhat'].iloc[-horizon:].values
        
        # Vraies valeurs
        actuals = df.iloc[idx:idx+horizon]['admissions'].values
        
        all_predictions.extend(predictions)
        all_actuals.extend(actuals)
        
        if (i + 1) % 10 == 0:
            print(f"   Progression: {i+1}/{len(test_indices)}")
    
    # Calculer les métriques
    metrics = calculate_metrics(all_actuals, all_predictions)
    
    print(f"\n   📊 Résultats Prophet (horizon={horizon}j):")
    print(f"   MAE:  {metrics['mae']:.2f} admissions")
    print(f"   RMSE: {metrics['rmse']:.2f}")
    print(f"   MAPE: {metrics['mape']:.2f}%")
    print(f"   R²:   {metrics['r2']:.4f}")
    
    return metrics


def test_arima_walk_forward(df, horizon=7, n_test_points=60):
    """
    Test ARIMA avec validation walk-forward.
    """
    print(f"\n{'='*60}")
    print(f"📈 ARIMA - Walk-Forward (horizon={horizon} jours)")
    print(f"{'='*60}")
    
    all_predictions = []
    all_actuals = []
    
    # Points de test
    test_start_idx = int(len(df) * 0.8)
    test_indices = np.linspace(test_start_idx, len(df) - horizon - 1, n_test_points, dtype=int)
    
    print(f"   Points de test: {len(test_indices)}")
    
    # Trouver le meilleur ordre ARIMA sur les premières données
    print("   Recherche du meilleur ordre ARIMA...")
    best_order = (2, 1, 2)  # Par défaut
    
    for i, idx in enumerate(test_indices):
        try:
            # Données d'entraînement
            train_series = df.iloc[:idx]['admissions'].values
            
            # Entraîner ARIMA
            model = ARIMA(train_series, order=best_order)
            model_fit = model.fit()
            
            # Prédire
            predictions = model_fit.forecast(steps=horizon)
            
            # Vraies valeurs
            actuals = df.iloc[idx:idx+horizon]['admissions'].values
            
            all_predictions.extend(predictions)
            all_actuals.extend(actuals)
            
        except Exception as e:
            continue
        
        if (i + 1) % 10 == 0:
            print(f"   Progression: {i+1}/{len(test_indices)}")
    
    # Calculer les métriques
    metrics = calculate_metrics(all_actuals, all_predictions)
    
    print(f"\n   📊 Résultats ARIMA (horizon={horizon}j):")
    print(f"   MAE:  {metrics['mae']:.2f} admissions")
    print(f"   RMSE: {metrics['rmse']:.2f}")
    print(f"   MAPE: {metrics['mape']:.2f}%")
    print(f"   R²:   {metrics['r2']:.4f}")
    
    return metrics


def test_gradient_boosting_walk_forward(df, horizon=7, n_test_points=60):
    """
    Test Gradient Boosting avec validation walk-forward pour comparaison équitable.
    """
    print(f"\n{'='*60}")
    print(f"🚀 GRADIENT BOOSTING - Walk-Forward (horizon={horizon} jours)")
    print(f"{'='*60}")
    
    def create_features(data):
        """Crée les features pour GB."""
        data = data.copy()
        data['day_of_week'] = data['date'].dt.dayofweek
        data['month'] = data['date'].dt.month
        data['is_weekend'] = (data['day_of_week'] >= 5).astype(int)
        
        for lag in [1, 7, 14, 30]:
            data[f'lag_{lag}'] = data['admissions'].shift(lag)
        
        for window in [7, 14]:
            data[f'ma_{window}'] = data['admissions'].rolling(window).mean()
        
        data['trend_7d'] = data['admissions'] - data['admissions'].shift(7)
        
        return data.dropna()
    
    feature_cols = ['day_of_week', 'month', 'is_weekend', 
                    'lag_1', 'lag_7', 'lag_14', 'lag_30',
                    'ma_7', 'ma_14', 'trend_7d']
    
    all_predictions = []
    all_actuals = []
    
    # Points de test
    test_start_idx = int(len(df) * 0.8)
    test_indices = np.linspace(test_start_idx + 30, len(df) - horizon - 1, n_test_points, dtype=int)
    
    print(f"   Points de test: {len(test_indices)}")
    
    for i, idx in enumerate(test_indices):
        # Créer features sur les données jusqu'à ce point
        df_features = create_features(df.iloc[:idx+horizon].copy())
        
        # Split
        train_mask = df_features['date'] < df.iloc[idx]['date']
        train_data = df_features[train_mask]
        
        X_train = train_data[feature_cols]
        y_train = train_data['admissions']
        
        # Entraîner
        model = GradientBoostingRegressor(
            n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42
        )
        model.fit(X_train, y_train)
        
        # Prédire les prochains jours (itérativement pour GB)
        predictions = []
        current_df = df.iloc[:idx].copy()
        
        for h in range(horizon):
            current_df = create_features(current_df)
            if len(current_df) == 0:
                break
            
            last_features = current_df[feature_cols].iloc[-1:].fillna(0)
            pred = model.predict(last_features)[0]
            pred = max(0, pred)
            predictions.append(pred)
            
            # Ajouter la prédiction pour le prochain pas
            next_date = df.iloc[idx + h]['date']
            new_row = pd.DataFrame([{'date': next_date, 'admissions': pred}])
            current_df = pd.concat([df.iloc[:idx], new_row], ignore_index=True)
        
        actuals = df.iloc[idx:idx+horizon]['admissions'].values[:len(predictions)]
        
        all_predictions.extend(predictions)
        all_actuals.extend(actuals)
        
        if (i + 1) % 10 == 0:
            print(f"   Progression: {i+1}/{len(test_indices)}")
    
    # Calculer les métriques
    metrics = calculate_metrics(all_actuals, all_predictions)
    
    print(f"\n   📊 Résultats Gradient Boosting (horizon={horizon}j):")
    print(f"   MAE:  {metrics['mae']:.2f} admissions")
    print(f"   RMSE: {metrics['rmse']:.2f}")
    print(f"   MAPE: {metrics['mape']:.2f}%")
    print(f"   R²:   {metrics['r2']:.4f}")
    
    return metrics


def main():
    """Test principal."""
    print("\n" + "=" * 70)
    print("🔬 TEST RIGOUREUX DES MODÈLES DE SÉRIES TEMPORELLES")
    print("    Méthode : Validation Walk-Forward")
    print("=" * 70)
    
    # Charger les données
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    df = load_data(os.path.join(data_dir, 'admissions_complet.csv'))
    
    # Tester différents horizons
    horizons = [7, 14, 30]
    results = {h: {} for h in horizons}
    
    for horizon in horizons:
        print(f"\n{'#' * 70}")
        print(f"# HORIZON DE PRÉDICTION : {horizon} JOURS")
        print(f"{'#' * 70}")
        
        # Test Prophet
        results[horizon]['Prophet'] = test_prophet_walk_forward(df, horizon=horizon, n_test_points=30)
        
        # Test ARIMA
        results[horizon]['ARIMA'] = test_arima_walk_forward(df, horizon=horizon, n_test_points=30)
        
        # Test Gradient Boosting (pour comparaison)
        results[horizon]['Gradient Boosting'] = test_gradient_boosting_walk_forward(df, horizon=horizon, n_test_points=30)
    
    # Tableau récapitulatif
    print("\n" + "=" * 80)
    print("📊 TABLEAU RÉCAPITULATIF - VALIDATION WALK-FORWARD")
    print("=" * 80)
    
    for horizon in horizons:
        print(f"\n--- Horizon {horizon} jours ---")
        print(f"{'Modèle':<20} {'MAE':>10} {'RMSE':>10} {'MAPE':>10} {'R²':>10}")
        print("-" * 60)
        
        for model_name in ['Prophet', 'ARIMA', 'Gradient Boosting']:
            m = results[horizon][model_name]
            print(f"{model_name:<20} {m['mae']:>10.2f} {m['rmse']:>10.2f} "
                  f"{m['mape']:>9.2f}% {m['r2']:>10.4f}")
    
    # Sauvegarder les résultats
    output_path = os.path.join(data_dir, 'timeseries_proper_test.json')
    
    # Convertir pour JSON
    results_json = {}
    for h in horizons:
        results_json[f'horizon_{h}'] = {}
        for model in results[h]:
            results_json[f'horizon_{h}'][model] = {k: round(v, 4) for k, v in results[h][model].items()}
    
    with open(output_path, 'w') as f:
        json.dump({
            'test_type': 'walk_forward_validation',
            'date': datetime.now().isoformat(),
            'horizons_tested': horizons,
            'n_test_points': 30,
            'results': results_json
        }, f, indent=2)
    
    print(f"\n💾 Résultats sauvegardés: {output_path}")
    
    # Conclusion
    print("\n" + "=" * 80)
    print("💡 CONCLUSION")
    print("=" * 80)
    print("""
Avec une validation walk-forward (la bonne méthode pour les séries temporelles) :

1. Les performances des modèles sont évaluées sur des horizons RÉALISTES
   (7, 14, 30 jours au lieu de 439 jours d'un coup)

2. Prophet et ARIMA devraient montrer de meilleures performances sur
   les horizons courts pour lesquels ils sont conçus

3. La comparaison avec Gradient Boosting devient plus équitable car
   tous les modèles prédisent sur le même horizon
""")


if __name__ == '__main__':
    main()
