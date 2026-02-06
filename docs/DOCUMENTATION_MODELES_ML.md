# Documentation des Modèles de Prédiction
## Hôpital Pitié-Salpêtrière - Projet Data Science

**Date** : Février 2026  
**Objectif** : Prédire le nombre d'admissions hospitalières quotidiennes pour optimiser les ressources

---

## 1. Contexte et Objectif

### 1.1 Problématique
L'hôpital Pitié-Salpêtrière doit anticiper les pics d'affluence pour :
- Ajuster les effectifs de personnel
- Préparer les lits disponibles
- Optimiser la gestion des équipements médicaux

### 1.2 Données Utilisées
- **Source** : Données historiques d'admissions (2020-2025)
- **Volume** : 2 192 jours d'observations (~6 ans)
- **Variable cible** : Nombre d'admissions quotidiennes
- **Moyenne** : ~448 admissions/jour

---

## 2. Métriques d'Évaluation

Pour comparer nos modèles, nous utilisons 4 métriques complémentaires :

### 2.1 MAE (Mean Absolute Error) - Erreur Absolue Moyenne

**Formule** :
```
MAE = (1/n) × Σ |y_réel - y_prédit|
```

**Interprétation** :
- Mesure l'erreur moyenne en valeur absolue
- Unité : nombre d'admissions
- **Exemple** : MAE = 6.52 → le modèle se trompe de ±6.52 admissions en moyenne

**Avantages** :
- Facile à interpréter
- Robuste aux valeurs extrêmes

### 2.2 RMSE (Root Mean Square Error) - Racine de l'Erreur Quadratique Moyenne

**Formule** :
```
RMSE = √[(1/n) × Σ (y_réel - y_prédit)²]
```

**Interprétation** :
- Pénalise davantage les grosses erreurs (car mise au carré)
- Unité : nombre d'admissions
- Si RMSE ≈ MAE → erreurs homogènes
- Si RMSE >> MAE → présence d'erreurs importantes

**Avantages** :
- Sensible aux erreurs importantes (utile dans le contexte hospitalier où une grosse erreur peut être critique)

### 2.3 MAPE (Mean Absolute Percentage Error) - Erreur Absolue Moyenne en Pourcentage

**Formule** :
```
MAPE = (100/n) × Σ |( y_réel - y_prédit) / y_réel|
```

**Interprétation** :
- Exprime l'erreur en pourcentage de la valeur réelle
- Unité : pourcentage (%)
- **Exemple** : MAPE = 1.25% → erreur de 1.25% en moyenne
- Pour 450 admissions : 450 × 1.25% = 5.6 admissions d'erreur

**Avantages** :
- Permet de comparer des séries de différentes échelles
- Intuitif : "le modèle se trompe de X%"

**Limites** :
- Non défini si y_réel = 0 (division par zéro)

### 2.4 R² (Coefficient de Détermination)

**Formule** :
```
R² = 1 - [Σ(y_réel - y_prédit)² / Σ(y_réel - ȳ)²]
```
où ȳ est la moyenne des valeurs réelles.

**Interprétation** :
- Proportion de la variance expliquée par le modèle
- Échelle : 0 à 1 (peut être négatif si très mauvais)
- **Exemple** : R² = 0.98 → le modèle explique 98% de la variabilité

| Valeur R² | Interprétation |
|-----------|----------------|
| > 0.9 | Excellent |
| 0.7 - 0.9 | Bon |
| 0.5 - 0.7 | Acceptable |
| < 0.5 | Faible |

---

## 3. Modèles Testés

### 3.1 ARIMA (AutoRegressive Integrated Moving Average)

**Principe** :
Modèle statistique classique pour les séries temporelles qui combine :
- **AR** (AutoRegressive) : la valeur dépend des valeurs passées
- **I** (Integrated) : différenciation pour rendre la série stationnaire
- **MA** (Moving Average) : la valeur dépend des erreurs passées

**Paramètres** : ARIMA(2, 1, 2)
- p=2 : 2 termes autorégressifs
- d=1 : 1 différenciation
- q=2 : 2 termes de moyenne mobile

**Avantages** :
- Modèle de référence bien établi
- Interprétable statistiquement

**Limites** :
- Suppose une relation linéaire
- Difficulté à capturer les patterns complexes (événements, saisonnalités multiples)

### 3.2 Prophet (Facebook/Meta)

**Principe** :
Modèle additif développé par Facebook pour la prédiction de séries temporelles :
```
y(t) = tendance(t) + saisonnalité(t) + fêtes(t) + erreur(t)
```

**Configuration utilisée** :
- Saisonnalité annuelle : ✅
- Saisonnalité hebdomadaire : ✅
- Saisonnalité mensuelle : ✅ (ajoutée manuellement)
- Jours fériés français : ✅
- Régresseurs externes : weekend, hiver, lag_7

**Avantages** :
- Gestion automatique des saisonnalités multiples
- Robuste aux données manquantes
- Pas besoin de tuning manuel complexe
- Décomposition interprétable

**Limites** :
- Moins performant sur nos données que les méthodes ML

### 3.3 Random Forest Regressor

**Principe** :
Ensemble de nombreux arbres de décision dont les prédictions sont moyennées.

**Paramètres optimisés** (via Grid Search) :
- n_estimators : 200 arbres
- max_depth : 15 niveaux
- min_samples_split : 2
- min_samples_leaf : 1

**Avantages** :
- Capture les relations non-linéaires
- Robuste au surapprentissage
- Gère bien les features nombreuses

### 3.4 Gradient Boosting Regressor

**Principe** :
Construction séquentielle d'arbres où chaque nouvel arbre corrige les erreurs du précédent.

**Paramètres** :
- n_estimators : 200
- max_depth : 8
- learning_rate : 0.1

**Avantages** :
- Très performant sur les données structurées
- Optimise directement l'erreur de prédiction

### 3.5 Modèle Ensemble (Final)

**Principe** :
Combinaison pondérée des modèles précédents :
```
Prédiction = w₁×RF + w₂×GB + w₃×Prophet
```

**Poids calculés** (basés sur l'inverse de la MAE) :
| Modèle | Poids |
|--------|-------|
| Gradient Boosting | 51.3% |
| Random Forest | 42.6% |
| Prophet | 6.1% |

---

## 4. Feature Engineering

### 4.1 Features Temporelles de Base
| Feature | Description |
|---------|-------------|
| day_of_week | Jour de la semaine (0-6) |
| day_of_month | Jour du mois (1-31) |
| month | Mois (1-12) |
| quarter | Trimestre (1-4) |
| week_of_year | Semaine de l'année (1-52) |
| year | Année |

### 4.2 Features Cycliques (pour capturer la périodicité)
```python
sin_day_week = sin(2π × day_of_week / 7)
cos_day_week = cos(2π × day_of_week / 7)
# Idem pour mois, jour du mois
```
**Intérêt** : Le modèle comprend que Lundi (0) et Dimanche (6) sont proches dans le cycle.

### 4.3 Features Binaires
| Feature | Description |
|---------|-------------|
| is_weekend | 1 si samedi/dimanche |
| is_monday | 1 si lundi |
| is_winter | 1 si décembre/janvier/février |
| is_month_start | 1 si jour ≤ 3 |
| is_month_end | 1 si jour ≥ 28 |

### 4.4 Lags (Valeurs Passées)
| Feature | Description |
|---------|-------------|
| lag_1 | Admissions hier |
| lag_7 | Admissions il y a 1 semaine |
| lag_14 | Admissions il y a 2 semaines |
| lag_30 | Admissions il y a 1 mois |

### 4.5 Statistiques Glissantes
| Feature | Description |
|---------|-------------|
| ma_7 | Moyenne mobile 7 jours |
| ma_30 | Moyenne mobile 30 jours |
| std_7 | Écart-type 7 jours |
| ema_7 | Moyenne mobile exponentielle 7 jours |
| min_7 / max_7 | Min/max sur 7 jours |

### 4.6 Tendances
| Feature | Description |
|---------|-------------|
| trend_1d | Variation jour précédent |
| trend_7d | Variation vs semaine précédente |
| pct_change_7d | Variation en % vs semaine précédente |

**Total : 135 features créées**

---

## 5. Protocole de Test

### 5.1 Séparation Train/Validation/Test (70/15/15)

```
Données : 2192 jours (2020-2025)
├── Train      : 1534 jours (70%)  │ 2020-01-01 → 2024-03-13
├── Validation :  329 jours (15%)  │ 2024-03-14 → 2025-02-05
└── Test       :  329 jours (15%)  │ 2025-02-06 → 2025-12-31
```

**Pourquoi ces proportions ?**
- **70% Train** : Suffisant pour apprendre les patterns saisonniers sur plusieurs années
- **15% Validation** : Pour ajuster les hyperparamètres sans biaiser le test
- **15% Test** : Évaluation finale sur données jamais vues (près d'un an !)

**IMPORTANT** : Séparation **temporelle** (pas aléatoire) !
- En classification classique, on mélange aléatoirement
- Pour les séries temporelles, on DOIT respecter l'ordre chronologique
- Sinon : "data leakage" (le modèle "voit" le futur pendant l'entraînement)

### 5.2 Validation Croisée Temporelle (TimeSeriesSplit)

```
Fold 1: [==Train==][Val]
Fold 2: [====Train====][Val]
Fold 3: [======Train======][Val]
Fold 4: [========Train========][Val]
Fold 5: [==========Train==========][Val]
```

Contrairement à la K-Fold classique :
- Les données sont TOUJOURS dans l'ordre chronologique
- Le Train grandit à chaque fold
- Simule la situation réelle : prédire le futur avec le passé

### 5.3 Grid Search (Optimisation des Hyperparamètres)
Test de combinaisons de paramètres pour Random Forest :
```python
param_grid = {
    'n_estimators': [100, 200],
    'max_depth': [10, 15, 20],
    'min_samples_split': [2, 5],
    'min_samples_leaf': [1, 2],
}
# = 2×3×2×2 = 24 combinaisons testées
```

---

## 6. Résultats Comparatifs

### 6.1 Résultats avec Séparation Correcte (70/15/15)

| Modèle | MAE (Val) | MAE (Test) | R² (Test) | Overfitting ? |
|--------|-----------|------------|-----------|---------------|
| **Gradient Boosting** | 13.94 | **12.21** | **0.9620** | ❌ Non |
| Random Forest | 16.83 | 15.64 | 0.9474 | ❌ Non |
| Prophet | 54.53 | ~55 | 0.34 | ❌ Non |
| ARIMA | 61.68 | ~62 | 0.04 | ❌ Non |

**Interprétation** : MAE(Test) ≈ MAE(Val) signifie que le modèle généralise bien !

### 6.2 Validation Croisée Temporelle (5 folds)

| Fold | RF MAE | GB MAE |
|------|--------|--------|
| 1 | 23.81 | 29.05 |
| 2 | 19.89 | 21.66 |
| 3 | 18.63 | 17.19 |
| 4 | 18.65 | 16.64 |
| 5 | 17.02 | 14.09 |
| **Moyenne** | 19.60 | 19.73 |
| **Écart-type** | 2.29 | 5.26 |

**Observation** : Les performances s'améliorent avec plus de données (fold 1 → fold 5).

### 6.3 Interprétation

**Gradient Boosting** reste le meilleur modèle :
- Erreur moyenne de **12.21 admissions** sur ~448/jour
- Explique **96.2%** de la variabilité
- MAE(Test) < MAE(Val) → le modèle généralise bien ✅

**Pourquoi les MAE semblent plus hautes ?**

| Approche | Train | Test | MAE Test |
|----------|-------|------|----------|
| Initiale (97/3) | 2102j | 60j | 6.52 |
| Correcte (70/15/15) | 1514j | 325j | 12.21 |

La différence s'explique par :
1. **Moins de données d'entraînement** (70% vs 97%)
2. **Test plus représentatif** (325 jours vs 60 jours)
3. **Résultat plus réaliste** pour une mise en production

### 6.4 Amélioration par rapport au baseline

| Métrique | ARIMA (baseline) | Gradient Boosting | Amélioration |
|----------|------------------|-------------------|--------------|
| MAE | ~62 | 12.21 | **-80%** |
| R² | 0.04 | 0.96 | **+92 points** |

---

## 7. Bonnes Pratiques Respectées

### 7.1 Checklist des Bonnes Pratiques ML

| Pratique | Respectée | Détail |
|----------|-----------|--------|
| Séparation temporelle | ✅ | Pas de mélange aléatoire |
| Proportions 70/15/15 | ✅ | Standard de l'industrie |
| Set de validation | ✅ | Pour tuner les hyperparamètres |
| Pas de data leakage | ✅ | Lags calculés correctement |
| Validation croisée temporelle | ✅ | TimeSeriesSplit, 5 folds |
| Test final unique | ✅ | Jamais utilisé pour entraîner |
| Métriques multiples | ✅ | MAE, RMSE, MAPE, R² |
| Vérification overfitting | ✅ | MAE(Test) ≈ MAE(Val) |

### 7.2 Pourquoi la Séparation Temporelle est OBLIGATOIRE

**❌ MAUVAISE pratique (pour séries temporelles)** :
```python
# NE PAS FAIRE CECI !
from sklearn.model_selection import train_test_split
X_train, X_test = train_test_split(X, test_size=0.2, shuffle=True)
```
Problème : Le modèle peut "voir" des données futures pendant l'entraînement.

**✅ BONNE pratique** :
```python
# Séparation chronologique
X_train = X.iloc[:train_end]
X_test = X.iloc[train_end:]
```

---

## 8. Conclusion et Recommandations

### 8.1 Modèle Retenu
**Gradient Boosting** pour sa précision et sa capacité à généraliser.

### 8.2 Points Forts de Notre Approche
1. **Protocole rigoureux** : Séparation 70/15/15 temporelle
2. **Feature engineering riche** : 88+ features temporelles
3. **Validation robuste** : TimeSeriesSplit + test final indépendant
4. **Pas d'overfitting** : MAE(Test) ≤ MAE(Val)
5. **Comparaison honnête** : 5 modèles avec les mêmes données

### 8.3 Limites
1. Les prédictions sont basées sur des patterns historiques
2. Les événements exceptionnels (nouvelle pandémie) ne peuvent pas être anticipés
3. Les prédictions à long terme (>30 jours) sont moins fiables

### 8.4 Pistes d'Amélioration
1. Ajouter des données exogènes (météo, épidémies en cours)
2. Tester des modèles deep learning (LSTM, Transformer)
3. Réentraîner régulièrement avec les nouvelles données

---

## Annexe A : Code Simplifié

```python
# 1. Chargement des données
import pandas as pd
df = pd.read_csv('etablissement.csv')

# 2. Création des features
df['lag_1'] = df['admissions'].shift(1)
df['lag_7'] = df['admissions'].shift(7)
df['ma_7'] = df['admissions'].rolling(7).mean()

# 3. Split train/test
train = df[:-60]
test = df[-60:]

# 4. Entraînement Gradient Boosting
from sklearn.ensemble import GradientBoostingRegressor
model = GradientBoostingRegressor(n_estimators=200, max_depth=8)
model.fit(X_train, y_train)

# 5. Prédiction et évaluation
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)
```

---

## Annexe B : Glossaire

| Terme | Définition |
|-------|------------|
| **Feature** | Variable d'entrée du modèle |
| **Target** | Variable à prédire (admissions) |
| **Train set** | Données pour entraîner le modèle |
| **Test set** | Données pour évaluer le modèle |
| **Overfitting** | Modèle qui mémorise les données au lieu de généraliser |
| **Lag** | Valeur décalée dans le temps |
| **Moving Average** | Moyenne sur une fenêtre glissante |
| **Grid Search** | Recherche exhaustive des meilleurs paramètres |
| **Cross-validation** | Technique de validation robuste |

---

*Document généré automatiquement - Février 2026*
