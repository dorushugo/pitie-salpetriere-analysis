#!/usr/bin/env python3
"""
Évaluation Complète des Modèles de Prédiction
==============================================

Script pour évaluer les performances des modèles (Random Forest & ARIMA)
sur les données synthétiques et réelles.

Usage:
    python evaluate_models.py [--no-plots] [--save-results]

Outputs:
    - Métriques de performance (MAE, RMSE, R², MAPE)
    - Graphiques de visualisation (optionnel)
    - Fichier JSON avec les résultats
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from pathlib import Path
import json
import argparse
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from statsmodels.tsa.arima.model import ARIMA
    HAS_ARIMA = True
except ImportError:
    HAS_ARIMA = False
    print("⚠️ statsmodels non installé, ARIMA sera ignoré")

# Configuration
DATA_DIR = Path(__file__).parent.parent.parent / "data"
EXTERNAL_DIR = DATA_DIR / "external"
OUTPUT_DIR = DATA_DIR

plt.style.use('seaborn-v0_8-whitegrid')


def create_features(df, target_col='admissions'):
    """Crée les features pour le modèle ML."""
    df = df.copy()
    
    df['jour_semaine'] = df['date'].dt.dayofweek
    df['jour_mois'] = df['date'].dt.day
    df['mois'] = df['date'].dt.month
    df['semaine_annee'] = df['date'].dt.isocalendar().week.astype(int)
    
    df['sin_jour_semaine'] = np.sin(2 * np.pi * df['jour_semaine'] / 7)
    df['cos_jour_semaine'] = np.cos(2 * np.pi * df['jour_semaine'] / 7)
    df['sin_mois'] = np.sin(2 * np.pi * df['mois'] / 12)
    df['cos_mois'] = np.cos(2 * np.pi * df['mois'] / 12)
    
    df['est_weekend'] = (df['jour_semaine'] >= 5).astype(int)
    df['est_lundi'] = (df['jour_semaine'] == 0).astype(int)
    df['est_hiver'] = df['mois'].isin([12, 1, 2]).astype(int)
    df['est_printemps'] = df['mois'].isin([3, 4, 5]).astype(int)
    df['est_ete'] = df['mois'].isin([6, 7, 8]).astype(int)
    df['est_automne'] = df['mois'].isin([9, 10, 11]).astype(int)
    
    for lag in [1, 2, 3, 7, 14, 30]:
        df[f'{target_col}_lag_{lag}'] = df[target_col].shift(lag)
    
    for window in [7, 14, 30]:
        df[f'{target_col}_ma_{window}'] = df[target_col].rolling(window).mean()
        df[f'{target_col}_std_{window}'] = df[target_col].rolling(window).std()
    
    df['tendance_7j'] = df[target_col].diff(7)
    
    return df


FEATURE_COLS = [
    'jour_semaine', 'jour_mois', 'mois', 'semaine_annee',
    'sin_jour_semaine', 'cos_jour_semaine', 'sin_mois', 'cos_mois',
    'est_weekend', 'est_lundi',
    'est_hiver', 'est_printemps', 'est_ete', 'est_automne',
    'admissions_lag_1', 'admissions_lag_2', 'admissions_lag_3',
    'admissions_lag_7', 'admissions_lag_14', 'admissions_lag_30',
    'admissions_ma_7', 'admissions_ma_14', 'admissions_ma_30',
    'admissions_std_7', 'admissions_std_14', 'admissions_std_30',
    'tendance_7j',
]


def load_data():
    """Charge les données synthétiques et réelles."""
    print("📂 Chargement des données...")
    
    # Données synthétiques
    df = pd.read_csv(DATA_DIR / "admissions.csv")
    df['date'] = pd.to_datetime(df['date_admission'])
    
    df_daily = df.groupby('date').agg({'id_patient': 'count'}).reset_index()
    df_daily.columns = ['date', 'admissions']
    df_daily = df_daily.sort_values('date').reset_index(drop=True)
    
    print(f"   Données synthétiques: {len(df_daily)} jours")
    
    # Données COVID
    df_covid = None
    try:
        df_covid = pd.read_csv(EXTERNAL_DIR / "hospitalisations_covid.csv", sep=";")
        df_covid['jour'] = pd.to_datetime(df_covid['jour'])
        df_covid = df_covid[df_covid['dep'] == '75'].copy()
        df_covid = df_covid.sort_values('jour').reset_index(drop=True)
        print(f"   Données COVID Paris: {len(df_covid)} jours")
    except Exception as e:
        print(f"   ⚠️ Données COVID non disponibles")
    
    return df_daily, df_covid


def train_random_forest(X_train, y_train, X_test, y_test):
    """Entraîne et évalue Random Forest."""
    print("\n🌲 Entraînement Random Forest...")
    
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    metrics = {
        'mae': mean_absolute_error(y_test, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
        'r2': r2_score(y_test, y_pred),
        'mape': np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    }
    
    importance = pd.DataFrame({
        'feature': FEATURE_COLS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    return model, y_pred, metrics, importance


def train_arima(train_series, n_forecast):
    """Entraîne et évalue ARIMA."""
    if not HAS_ARIMA:
        return None, None, None
    
    print("\n📈 Entraînement ARIMA(2,1,2)...")
    
    try:
        model = ARIMA(train_series, order=(2, 1, 2))
        fit = model.fit()
        y_pred = fit.forecast(steps=n_forecast)
        return fit, y_pred, True
    except Exception as e:
        print(f"   ⚠️ Erreur ARIMA: {e}")
        return None, None, False


def cross_validate(X, y, n_splits=5):
    """Cross-validation temporelle."""
    print(f"\n🔄 Cross-validation ({n_splits} folds)...")
    
    tscv = TimeSeriesSplit(n_splits=n_splits)
    scores_mae, scores_r2 = [], []
    
    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
        
        model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_val)
        
        scores_mae.append(mean_absolute_error(y_val, y_pred))
        scores_r2.append(r2_score(y_val, y_pred))
        print(f"   Fold {fold+1}: MAE={scores_mae[-1]:.2f}, R²={scores_r2[-1]:.3f}")
    
    return {
        'mae_mean': np.mean(scores_mae),
        'mae_std': np.std(scores_mae),
        'r2_mean': np.mean(scores_r2),
        'r2_std': np.std(scores_r2)
    }


def plot_results(dates_test, y_test, y_pred_rf, y_pred_arima, importance, metrics_rf, metrics_arima):
    """Génère les visualisations."""
    print("\n📊 Génération des graphiques...")
    
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # 1. Série temporelle
    ax1 = axes[0, 0]
    ax1.plot(dates_test, y_test.values, 'b-', label='Réel', linewidth=1)
    ax1.plot(dates_test, y_pred_rf, 'g-', label=f'RF (MAE={metrics_rf["mae"]:.1f})', alpha=0.8)
    if y_pred_arima is not None:
        ax1.plot(dates_test, y_pred_arima, 'r-', label=f'ARIMA (MAE={metrics_arima["mae"]:.1f})', alpha=0.8)
    ax1.set_title('Prédictions vs Réel')
    ax1.legend()
    
    # 2. Scatter
    ax2 = axes[0, 1]
    ax2.scatter(y_test, y_pred_rf, alpha=0.5, s=20)
    ax2.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
    ax2.set_xlabel('Réel')
    ax2.set_ylabel('Prédit')
    ax2.set_title(f'Scatter (R² = {metrics_rf["r2"]:.3f})')
    
    # 3. Distribution erreurs
    ax3 = axes[1, 0]
    errors = y_test.values - y_pred_rf
    ax3.hist(errors, bins=50, edgecolor='black', alpha=0.7)
    ax3.axvline(0, color='r', linestyle='--')
    ax3.set_title('Distribution des Erreurs')
    
    # 4. Feature importance
    ax4 = axes[1, 1]
    top_10 = importance.head(10)
    ax4.barh(top_10['feature'], top_10['importance'], color='steelblue')
    ax4.set_title('Top 10 Features')
    ax4.invert_yaxis()
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'viz_model_evaluation.png', dpi=150, bbox_inches='tight')
    plt.show()
    print(f"   Graphique sauvegardé: {OUTPUT_DIR / 'viz_model_evaluation.png'}")


def print_results(metrics_rf, metrics_arima, cv_results, importance):
    """Affiche les résultats."""
    print("\n" + "="*60)
    print("📊 RÉSULTATS DE L'ÉVALUATION")
    print("="*60)
    
    print("\n🌲 RANDOM FOREST:")
    print(f"   MAE:  {metrics_rf['mae']:.2f} admissions/jour")
    print(f"   RMSE: {metrics_rf['rmse']:.2f}")
    print(f"   MAPE: {metrics_rf['mape']:.2f}%")
    print(f"   R²:   {metrics_rf['r2']:.4f}")
    
    if metrics_arima:
        print("\n📈 ARIMA:")
        print(f"   MAE:  {metrics_arima['mae']:.2f}")
        print(f"   RMSE: {metrics_arima['rmse']:.2f}")
        print(f"   MAPE: {metrics_arima['mape']:.2f}%")
        print(f"   R²:   {metrics_arima['r2']:.4f}")
    
    print("\n🔄 CROSS-VALIDATION:")
    print(f"   MAE: {cv_results['mae_mean']:.2f} ± {cv_results['mae_std']:.2f}")
    print(f"   R²:  {cv_results['r2_mean']:.3f} ± {cv_results['r2_std']:.3f}")
    
    print("\n📊 TOP 5 FEATURES:")
    for idx, row in importance.head(5).iterrows():
        print(f"   {row['feature']}: {row['importance']:.1%}")
    
    print("="*60)


def main():
    parser = argparse.ArgumentParser(description='Évaluation des modèles de prédiction')
    parser.add_argument('--no-plots', action='store_true', help='Désactiver les graphiques')
    parser.add_argument('--save-results', action='store_true', help='Sauvegarder les résultats en JSON')
    args = parser.parse_args()
    
    print("="*60)
    print("🏥 ÉVALUATION DES MODÈLES - PITIÉ-SALPÊTRIÈRE")
    print("="*60)
    
    # Charger données
    df_daily, df_covid = load_data()
    
    # Créer features
    df_features = create_features(df_daily)
    df_features = df_features.dropna()
    
    X = df_features[FEATURE_COLS]
    y = df_features['admissions']
    
    # Split
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    dates_test = df_features['date'].iloc[split_idx:]
    
    print(f"\n📊 Split: {len(X_train)} train / {len(X_test)} test")
    
    # Random Forest
    rf_model, y_pred_rf, metrics_rf, importance = train_random_forest(X_train, y_train, X_test, y_test)
    
    # ARIMA
    train_series = df_daily['admissions'].iloc[:split_idx]
    test_series = df_daily['admissions'].iloc[split_idx:split_idx+len(X_test)]
    arima_fit, y_pred_arima, arima_success = train_arima(train_series, len(X_test))
    
    metrics_arima = None
    if arima_success and y_pred_arima is not None:
        metrics_arima = {
            'mae': mean_absolute_error(test_series, y_pred_arima),
            'rmse': np.sqrt(mean_squared_error(test_series, y_pred_arima)),
            'r2': r2_score(test_series, y_pred_arima),
            'mape': np.mean(np.abs((test_series - y_pred_arima) / test_series)) * 100
        }
    
    # Cross-validation
    cv_results = cross_validate(X, y)
    
    # Résultats
    print_results(metrics_rf, metrics_arima, cv_results, importance)
    
    # Graphiques
    if not args.no_plots:
        plot_results(dates_test, y_test, y_pred_rf, y_pred_arima, importance, metrics_rf, metrics_arima)
    
    # Sauvegarder
    if args.save_results:
        results = {
            'date': datetime.now().isoformat(),
            'random_forest': {k: round(v, 4) for k, v in metrics_rf.items()},
            'cross_validation': {k: round(v, 4) for k, v in cv_results.items()},
            'top_features': importance.head(10).to_dict('records')
        }
        if metrics_arima:
            results['arima'] = {k: round(v, 4) for k, v in metrics_arima.items()}
        
        with open(OUTPUT_DIR / 'model_evaluation_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n✅ Résultats sauvegardés: {OUTPUT_DIR / 'model_evaluation_results.json'}")
    
    print("\n✅ Évaluation terminée!")


if __name__ == "__main__":
    main()
