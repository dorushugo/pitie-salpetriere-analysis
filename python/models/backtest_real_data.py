#!/usr/bin/env python3
"""
Backtest du modèle de prédiction sur les données RÉELLES
=========================================================

Ce script teste notre modèle Random Forest sur les vraies données
COVID/urgences pour valider son efficacité sur des cas réels.

Données utilisées:
- hospitalisations_covid.csv (Paris, 2020-2023)
- Prédiction à J+7 comparée à la réalité
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from pathlib import Path
import json
from datetime import datetime, timedelta

DATA_DIR = Path(__file__).parent.parent.parent / "data"
EXTERNAL_DIR = DATA_DIR / "external"
OUTPUT_DIR = DATA_DIR


def load_real_data():
    """Charge les données réelles d'hospitalisations COVID Paris."""
    print("Chargement des données réelles (hospitalisations COVID Paris)...")
    
    df = pd.read_csv(EXTERNAL_DIR / "hospitalisations_covid.csv", sep=";")
    df['jour'] = pd.to_datetime(df['jour'])
    
    # Filtrer Paris (75)
    df_paris = df[df['dep'] == '75'].copy()
    df_paris = df_paris.sort_values('jour')
    df_paris = df_paris.reset_index(drop=True)
    
    print(f"  Période: {df_paris['jour'].min().date()} à {df_paris['jour'].max().date()}")
    print(f"  Jours: {len(df_paris)}")
    print(f"  Moyenne hospitalisations/jour: {df_paris['incid_hosp'].mean():.1f}")
    
    return df_paris


def create_features(df, target_col='incid_hosp'):
    """Crée les features pour le modèle (même logique que ml_predictions.py)."""
    df = df.copy()
    
    # Features temporelles
    df['jour_semaine'] = df['jour'].dt.dayofweek
    df['jour_mois'] = df['jour'].dt.day
    df['mois'] = df['jour'].dt.month
    df['semaine_annee'] = df['jour'].dt.isocalendar().week.astype(int)
    
    # Encodage cyclique
    df['sin_jour_semaine'] = np.sin(2 * np.pi * df['jour_semaine'] / 7)
    df['cos_jour_semaine'] = np.cos(2 * np.pi * df['jour_semaine'] / 7)
    df['sin_mois'] = np.sin(2 * np.pi * df['mois'] / 12)
    df['cos_mois'] = np.cos(2 * np.pi * df['mois'] / 12)
    
    # Indicateurs
    df['est_weekend'] = (df['jour_semaine'] >= 5).astype(int)
    df['est_lundi'] = (df['jour_semaine'] == 0).astype(int)
    
    # Saisons
    df['est_hiver'] = df['mois'].isin([12, 1, 2]).astype(int)
    df['est_printemps'] = df['mois'].isin([3, 4, 5]).astype(int)
    df['est_ete'] = df['mois'].isin([6, 7, 8]).astype(int)
    df['est_automne'] = df['mois'].isin([9, 10, 11]).astype(int)
    
    # Features lag (historique)
    for lag in [1, 2, 3, 7, 14, 30]:
        df[f'{target_col}_lag_{lag}'] = df[target_col].shift(lag)
    
    # Moyennes mobiles
    for window in [7, 14, 30]:
        df[f'{target_col}_ma_{window}'] = df[target_col].rolling(window).mean()
        df[f'{target_col}_std_{window}'] = df[target_col].rolling(window).std()
    
    # Tendance
    df['tendance_7j'] = df[target_col].diff(7)
    
    return df


def backtest_model(df, horizon=7, test_ratio=0.3):
    """
    Effectue un backtest du modèle avec prédiction à horizon J+N.
    
    Args:
        df: DataFrame avec les données
        horizon: Nombre de jours à prédire à l'avance
        test_ratio: Proportion des données pour le test
    """
    print(f"\n{'='*60}")
    print(f"BACKTEST - Prédiction à J+{horizon}")
    print('='*60)
    
    target_col = 'incid_hosp'
    
    # Créer les features
    df_feat = create_features(df, target_col)
    
    # Créer la target décalée (ce qu'on veut prédire dans N jours)
    df_feat['target'] = df_feat[target_col].shift(-horizon)
    
    # Supprimer les lignes avec NaN
    df_feat = df_feat.dropna()
    
    # Features à utiliser
    feature_cols = [
        'jour_semaine', 'jour_mois', 'mois', 'semaine_annee',
        'sin_jour_semaine', 'cos_jour_semaine', 'sin_mois', 'cos_mois',
        'est_weekend', 'est_lundi',
        'est_hiver', 'est_printemps', 'est_ete', 'est_automne',
        f'{target_col}_lag_1', f'{target_col}_lag_2', f'{target_col}_lag_3',
        f'{target_col}_lag_7', f'{target_col}_lag_14', f'{target_col}_lag_30',
        f'{target_col}_ma_7', f'{target_col}_ma_14', f'{target_col}_ma_30',
        f'{target_col}_std_7', f'{target_col}_std_14', f'{target_col}_std_30',
        'tendance_7j'
    ]
    
    X = df_feat[feature_cols]
    y = df_feat['target']
    dates = df_feat['jour']
    
    # Split train/test (temporel, pas aléatoire!)
    split_idx = int(len(X) * (1 - test_ratio))
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    dates_test = dates.iloc[split_idx:]
    
    print(f"\nDonnées:")
    print(f"  Train: {len(X_train)} jours ({df_feat['jour'].iloc[0].date()} → {df_feat['jour'].iloc[split_idx].date()})")
    print(f"  Test: {len(X_test)} jours ({df_feat['jour'].iloc[split_idx].date()} → {df_feat['jour'].iloc[-1].date()})")
    
    # Entraîner le modèle
    print("\nEntraînement Random Forest...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Prédictions
    y_pred = model.predict(X_test)
    
    # Métriques
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    # MAPE (en évitant division par zéro)
    mask = y_test > 0
    mape = np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100
    
    print(f"\n📊 RÉSULTATS BACKTEST (données RÉELLES):")
    print(f"  MAE:  {mae:.2f} hospitalisations/jour")
    print(f"  RMSE: {rmse:.2f}")
    print(f"  MAPE: {mape:.2f}%")
    print(f"  R²:   {r2:.4f}")
    
    # Analyse par période
    results_df = pd.DataFrame({
        'date': dates_test.values,
        'reel': y_test.values,
        'predit': y_pred,
        'erreur': np.abs(y_test.values - y_pred),
        'erreur_pct': np.abs((y_test.values - y_pred) / np.maximum(y_test.values, 1)) * 100
    })
    
    # Analyser performance par phase épidémique
    print(f"\n📈 Performance par niveau d'activité:")
    
    q25 = y_test.quantile(0.25)
    q75 = y_test.quantile(0.75)
    
    low_mask = y_test <= q25
    mid_mask = (y_test > q25) & (y_test <= q75)
    high_mask = y_test > q75
    
    for name, mask in [("Faible (<P25)", low_mask), ("Moyen (P25-P75)", mid_mask), ("Élevé (>P75)", high_mask)]:
        if mask.sum() > 0:
            mae_period = mean_absolute_error(y_test[mask], y_pred[mask])
            mape_period = np.mean(np.abs((y_test[mask] - y_pred[mask]) / np.maximum(y_test[mask], 1))) * 100
            print(f"  {name}: MAE={mae_period:.1f}, MAPE={mape_period:.1f}%")
    
    # Sauvegarder les résultats
    return {
        'horizon': horizon,
        'metrics': {
            'mae': round(mae, 2),
            'rmse': round(rmse, 2),
            'mape': round(mape, 2),
            'r2': round(r2, 4)
        },
        'test_period': {
            'start': str(dates_test.iloc[0].date()),
            'end': str(dates_test.iloc[-1].date()),
            'days': len(y_test)
        },
        'predictions_sample': results_df.head(30).to_dict('records')
    }


def run_multiple_horizons():
    """Teste le modèle sur plusieurs horizons de prédiction."""
    df = load_real_data()
    
    results = {}
    
    for horizon in [1, 3, 7, 14, 30]:
        result = backtest_model(df, horizon=horizon, test_ratio=0.3)
        results[f'horizon_{horizon}'] = result
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ - PERFORMANCE PAR HORIZON")
    print("="*60)
    print(f"{'Horizon':<12} {'MAE':<10} {'MAPE':<10} {'R²':<10}")
    print("-"*42)
    
    for horizon in [1, 3, 7, 14, 30]:
        m = results[f'horizon_{horizon}']['metrics']
        print(f"J+{horizon:<10} {m['mae']:<10.1f} {m['mape']:<10.1f}% {m['r2']:<10.3f}")
    
    # Sauvegarder
    output = {
        'generated_at': datetime.now().isoformat(),
        'data_source': 'hospitalisations_covid.csv (Paris)',
        'model': 'RandomForest',
        'results': results
    }
    
    output_file = OUTPUT_DIR / "backtest_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n✅ Résultats sauvegardés: {output_file}")
    
    return results


if __name__ == "__main__":
    run_multiple_horizons()
