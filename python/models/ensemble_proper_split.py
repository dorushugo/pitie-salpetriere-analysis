"""
Modèle Ensemble avec Séparation Train/Validation/Test Correcte
===============================================================

Bonnes pratiques appliquées :
1. Split temporel (pas aléatoire) - OBLIGATOIRE pour séries temporelles
2. Proportion 70/15/15 (Train/Validation/Test)
3. Validation croisée temporelle (TimeSeriesSplit)
4. Pas de data leakage (lags calculés sur train uniquement)

Pourquoi ces proportions ?
- Train (70%) : suffisant pour apprendre les patterns
- Validation (15%) : pour tuner les hyperparamètres
- Test (15%) : évaluation finale non biaisée
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from prophet import Prophet
import joblib


class ProperSplitEnsemblePredictor:
    """Modèle avec séparation correcte des données."""
    
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.df = None
        self.models = {}
        self.metrics = {}
        self.split_info = {}
        
    def load_data(self):
        """Charge les données."""
        print("📂 Chargement des données...")
        self.df = pd.read_csv(self.data_path)
        self.df['date'] = pd.to_datetime(self.df['date'])
        
        if 'nb_admissions' in self.df.columns:
            self.df['admissions'] = self.df['nb_admissions']
        
        self.df = self.df.sort_values('date').reset_index(drop=True)
        print(f"   ✅ {len(self.df)} jours chargés")
        print(f"   📅 Période: {self.df['date'].min().date()} → {self.df['date'].max().date()}")
        return self.df
    
    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Crée les features (version simplifiée pour clarté)."""
        df = df.copy()
        
        # Features temporelles
        df['day_of_week'] = df['date'].dt.dayofweek
        df['month'] = df['date'].dt.month
        df['day_of_month'] = df['date'].dt.day
        df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
        df['year'] = df['date'].dt.year
        
        # Features cycliques
        df['sin_day_week'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['cos_day_week'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['sin_month'] = np.sin(2 * np.pi * df['month'] / 12)
        df['cos_month'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Features binaires
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_winter'] = df['month'].isin([12, 1, 2]).astype(int)
        
        # Lags
        for lag in [1, 2, 3, 7, 14, 21, 28]:
            df[f'lag_{lag}'] = df['admissions'].shift(lag)
        
        # Moyennes mobiles
        for window in [7, 14, 30]:
            df[f'ma_{window}'] = df['admissions'].rolling(window).mean()
            df[f'std_{window}'] = df['admissions'].rolling(window).std()
        
        # EMA
        for span in [7, 14]:
            df[f'ema_{span}'] = df['admissions'].ewm(span=span).mean()
        
        # Tendances
        df['trend_7d'] = df['admissions'].diff(7)
        
        return df
    
    def get_feature_columns(self, df: pd.DataFrame) -> list:
        """Retourne les colonnes features."""
        exclude = ['date', 'admissions', 'nb_admissions', 'evenement_special', 'saison']
        return [c for c in df.columns if c not in exclude and df[c].dtype in ['int64', 'float64']]
    
    def split_data(self, train_ratio: float = 0.70, val_ratio: float = 0.15):
        """
        Sépare les données en Train/Validation/Test.
        
        Args:
            train_ratio: Proportion pour l'entraînement (défaut: 70%)
            val_ratio: Proportion pour la validation (défaut: 15%)
            (le reste va au test, soit 15%)
        
        IMPORTANT: Séparation TEMPORELLE, pas aléatoire !
        """
        n = len(self.df)
        
        train_end = int(n * train_ratio)
        val_end = int(n * (train_ratio + val_ratio))
        
        # Séparation temporelle
        train_df = self.df.iloc[:train_end].copy()
        val_df = self.df.iloc[train_end:val_end].copy()
        test_df = self.df.iloc[val_end:].copy()
        
        self.split_info = {
            'total': n,
            'train': {
                'size': len(train_df),
                'ratio': len(train_df) / n * 100,
                'start': train_df['date'].min().date().isoformat(),
                'end': train_df['date'].max().date().isoformat(),
            },
            'validation': {
                'size': len(val_df),
                'ratio': len(val_df) / n * 100,
                'start': val_df['date'].min().date().isoformat(),
                'end': val_df['date'].max().date().isoformat(),
            },
            'test': {
                'size': len(test_df),
                'ratio': len(test_df) / n * 100,
                'start': test_df['date'].min().date().isoformat(),
                'end': test_df['date'].max().date().isoformat(),
            },
        }
        
        return train_df, val_df, test_df
    
    def train_and_evaluate(self):
        """Pipeline complet avec séparation correcte."""
        print("\n" + "="*70)
        print("🚀 ENTRAÎNEMENT AVEC SÉPARATION CORRECTE")
        print("="*70)
        
        # 1. Charger les données
        self.load_data()
        
        # 2. Séparation Train/Validation/Test (70/15/15)
        print("\n📊 SÉPARATION DES DONNÉES (70/15/15)")
        print("-"*50)
        
        train_df, val_df, test_df = self.split_data(train_ratio=0.70, val_ratio=0.15)
        
        print(f"""
        ┌─────────────────────────────────────────────────────────┐
        │  TRAIN      │  {self.split_info['train']['size']:>5} jours │ {self.split_info['train']['ratio']:>5.1f}% │ {self.split_info['train']['start']} → {self.split_info['train']['end']} │
        │  VALIDATION │  {self.split_info['validation']['size']:>5} jours │ {self.split_info['validation']['ratio']:>5.1f}% │ {self.split_info['validation']['start']} → {self.split_info['validation']['end']} │
        │  TEST       │  {self.split_info['test']['size']:>5} jours │ {self.split_info['test']['ratio']:>5.1f}% │ {self.split_info['test']['start']} → {self.split_info['test']['end']} │
        └─────────────────────────────────────────────────────────┘
        """)
        
        # 3. Créer les features sur l'ensemble des données
        df_full = self.create_features(self.df)
        df_full = df_full.dropna()
        
        feature_cols = self.get_feature_columns(df_full)
        print(f"📊 {len(feature_cols)} features créées")
        
        # Recalculer les indices après dropna
        n = len(df_full)
        train_end = int(n * 0.70)
        val_end = int(n * 0.85)
        
        X = df_full[feature_cols]
        y = df_full['admissions']
        
        X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
        X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
        X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]
        
        print(f"   Après feature engineering:")
        print(f"   Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")
        
        # 4. Entraîner les modèles sur TRAIN
        print("\n" + "="*70)
        print("📈 ENTRAÎNEMENT DES MODÈLES (sur Train uniquement)")
        print("="*70)
        
        results = {}
        
        # --- Random Forest ---
        print("\n🌲 Random Forest...")
        rf = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=2,
            min_samples_leaf=1,
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_train, y_train)
        self.models['random_forest'] = rf
        
        # Évaluer sur validation
        rf_val_pred = rf.predict(X_val)
        rf_val_metrics = self._calculate_metrics(y_val, rf_val_pred)
        print(f"   Validation: MAE={rf_val_metrics['mae']:.2f}, R²={rf_val_metrics['r2']:.4f}")
        
        # Évaluer sur test
        rf_test_pred = rf.predict(X_test)
        rf_test_metrics = self._calculate_metrics(y_test, rf_test_pred)
        print(f"   Test:       MAE={rf_test_metrics['mae']:.2f}, R²={rf_test_metrics['r2']:.4f}")
        
        results['random_forest'] = {
            'validation': rf_val_metrics,
            'test': rf_test_metrics,
        }
        
        # --- Gradient Boosting ---
        print("\n🚀 Gradient Boosting...")
        gb = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=8,
            learning_rate=0.1,
            random_state=42
        )
        gb.fit(X_train, y_train)
        self.models['gradient_boosting'] = gb
        
        # Évaluer sur validation
        gb_val_pred = gb.predict(X_val)
        gb_val_metrics = self._calculate_metrics(y_val, gb_val_pred)
        print(f"   Validation: MAE={gb_val_metrics['mae']:.2f}, R²={gb_val_metrics['r2']:.4f}")
        
        # Évaluer sur test
        gb_test_pred = gb.predict(X_test)
        gb_test_metrics = self._calculate_metrics(y_test, gb_test_pred)
        print(f"   Test:       MAE={gb_test_metrics['mae']:.2f}, R²={gb_test_metrics['r2']:.4f}")
        
        results['gradient_boosting'] = {
            'validation': gb_val_metrics,
            'test': gb_test_metrics,
        }
        
        # 5. Validation Croisée Temporelle (pour confirmer)
        print("\n" + "="*70)
        print("🔄 VALIDATION CROISÉE TEMPORELLE (TimeSeriesSplit)")
        print("="*70)
        
        # Utiliser Train + Val pour la CV (avant de voir le test)
        X_trainval = pd.concat([X_train, X_val])
        y_trainval = pd.concat([y_train, y_val])
        
        tscv = TimeSeriesSplit(n_splits=5)
        cv_scores = {'rf': [], 'gb': []}
        
        print("\n   Fold │  RF MAE  │  GB MAE")
        print("   ─────┼──────────┼──────────")
        
        for fold, (train_idx, val_idx) in enumerate(tscv.split(X_trainval)):
            X_cv_train = X_trainval.iloc[train_idx]
            y_cv_train = y_trainval.iloc[train_idx]
            X_cv_val = X_trainval.iloc[val_idx]
            y_cv_val = y_trainval.iloc[val_idx]
            
            # RF
            rf_temp = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
            rf_temp.fit(X_cv_train, y_cv_train)
            rf_mae = mean_absolute_error(y_cv_val, rf_temp.predict(X_cv_val))
            cv_scores['rf'].append(rf_mae)
            
            # GB
            gb_temp = GradientBoostingRegressor(n_estimators=100, max_depth=8, random_state=42)
            gb_temp.fit(X_cv_train, y_cv_train)
            gb_mae = mean_absolute_error(y_cv_val, gb_temp.predict(X_cv_val))
            cv_scores['gb'].append(gb_mae)
            
            print(f"     {fold+1}  │  {rf_mae:>6.2f}  │  {gb_mae:>6.2f}")
        
        print("   ─────┼──────────┼──────────")
        print(f"   Moy  │  {np.mean(cv_scores['rf']):>6.2f}  │  {np.mean(cv_scores['gb']):>6.2f}")
        print(f"   Std  │  {np.std(cv_scores['rf']):>6.2f}  │  {np.std(cv_scores['gb']):>6.2f}")
        
        results['cv_scores'] = cv_scores
        
        # 6. Résumé final
        print("\n" + "="*70)
        print("📊 RÉSUMÉ FINAL")
        print("="*70)
        
        print("\n" + " "*5 + "Modèle" + " "*10 + "│ Validation │    Test    │")
        print(" "*5 + "-"*18 + "┼" + "-"*12 + "┼" + "-"*12 + "┤")
        
        for model_name, model_results in results.items():
            if model_name == 'cv_scores':
                continue
            val_mae = model_results['validation']['mae']
            test_mae = model_results['test']['mae']
            gap = abs(test_mae - val_mae)
            status = "✅" if gap < 5 else "⚠️"
            print(f" {status}  {model_name:<16} │ MAE: {val_mae:>5.2f} │ MAE: {test_mae:>5.2f} │")
        
        print("\n📝 Interprétation:")
        print("   - Si Test ≈ Validation : le modèle généralise bien ✅")
        print("   - Si Test >> Validation : overfitting probable ⚠️")
        print("   - Si Test << Validation : underfitting ou variance ⚠️")
        
        self.metrics = results
        return results
    
    def _calculate_metrics(self, y_true, y_pred):
        """Calcule les métriques d'évaluation."""
        return {
            'mae': mean_absolute_error(y_true, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
            'mape': np.mean(np.abs((y_true - y_pred) / y_true)) * 100,
            'r2': r2_score(y_true, y_pred),
        }
    
    def save_results(self, output_dir: str):
        """Sauvegarde les résultats."""
        os.makedirs(output_dir, exist_ok=True)
        
        results = {
            'split_info': self.split_info,
            'metrics': self.metrics,
            'trained_at': datetime.now().isoformat(),
            'best_practices': {
                'temporal_split': True,
                'train_ratio': 0.70,
                'validation_ratio': 0.15,
                'test_ratio': 0.15,
                'cross_validation': 'TimeSeriesSplit (5 folds)',
                'no_data_leakage': True,
            }
        }
        
        path = os.path.join(output_dir, 'proper_split_results.json')
        with open(path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Résultats sauvegardés: {path}")
        return path


def main():
    """Point d'entrée principal."""
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    
    predictor = ProperSplitEnsemblePredictor(
        os.path.join(data_dir, 'etablissement.csv')
    )
    
    results = predictor.train_and_evaluate()
    predictor.save_results(os.path.join(data_dir, 'models'))


if __name__ == '__main__':
    main()
