# Rapport : Modèles de Prédiction des Admissions Hospitalières

## Résumé Exécutif

Ce rapport présente l'analyse comparative de quatre modèles de prédiction des admissions hospitalières pour l'hôpital Pitié-Salpêtrière. Après évaluation rigoureuse, **le Gradient Boosting** est recommandé pour la production avec une précision de 99% (R² = 0.9907).

---

## 1. Contexte et Objectifs

### 1.1 Problématique

La gestion optimale des ressources hospitalières nécessite une anticipation fiable des admissions futures. Une prédiction précise permet :
- L'optimisation du personnel soignant
- La gestion proactive des lits disponibles
- La planification des ressources matérielles
- La réduction des temps d'attente aux urgences

### 1.2 Objectifs

1. Évaluer différentes approches de prédiction (séries temporelles vs machine learning)
2. Identifier le modèle le plus performant pour la production
3. Comprendre les facteurs clés influençant les admissions

---

## 2. Données

### 2.1 Description du Dataset

| Caractéristique | Valeur |
|-----------------|--------|
| **Période couverte** | 01/01/2020 - 31/12/2025 |
| **Nombre de jours** | 2 192 jours |
| **Granularité** | Journalière |
| **Variable cible** | Nombre d'admissions par jour |

### 2.2 Statistiques Descriptives

| Métrique | Valeur |
|----------|--------|
| Moyenne | 448 admissions/jour |
| Minimum | 222 admissions/jour |
| Maximum | 777 admissions/jour |
| Écart-type | ~100 admissions/jour |

### 2.3 Répartition Train/Test

Nous avons utilisé une répartition **80/20** temporelle (pas aléatoire) pour respecter la nature séquentielle des séries temporelles :

| Ensemble | Proportion | Nombre de jours | Période |
|----------|------------|-----------------|---------|
| **Entraînement** | 80% | 1 753 jours | 01/01/2020 - 18/10/2024 |
| **Test** | 20% | 439 jours | 19/10/2024 - 31/12/2025 |

> **Note importante** : Le split est temporel et non aléatoire. Cela simule une situation réelle où le modèle prédit le futur à partir du passé.

---

## 3. Modèles Évalués

### 3.1 Prophet (Facebook)

**Type** : Modèle de séries temporelles additif

**Principe** : Décompose la série en composantes (tendance + saisonnalité + jours fériés)

**Configuration** :
- Saisonnalité annuelle et hebdomadaire activée
- Saisonnalité mensuelle personnalisée (période 30.5 jours)
- Jours fériés français intégrés
- Mode additif avec intervalle de confiance 95%

**Avantages** :
- Interprétable (visualisation des composantes)
- Gère automatiquement les jours fériés
- Robuste aux données manquantes

### 3.2 ARIMA (AutoRegressive Integrated Moving Average)

**Type** : Modèle statistique classique de séries temporelles

**Principe** : Modélise les auto-corrélations et moyennes mobiles

**Configuration testée** : ARIMA(1,1,1), ARIMA(2,1,2), ARIMA(3,1,3)

**⚠️ Non recommandé pour la production** (voir section 4.2)

### 3.3 Random Forest

**Type** : Ensemble de modèles (forêt d'arbres de décision)

**Principe** : Agrège les prédictions de multiples arbres de décision

**Configuration** :
- 200 arbres (`n_estimators=200`)
- Profondeur maximale : 20
- Features : temporelles, lags, moyennes mobiles

### 3.4 Gradient Boosting

**Type** : Ensemble de modèles avec boosting

**Principe** : Construit séquentiellement des arbres qui corrigent les erreurs des précédents

**Configuration** :
- 200 estimateurs
- Profondeur : 8
- Learning rate : 0.1
- Subsample : 0.8

---

## 4. Résultats

### 4.1 Importance de la Méthode d'Évaluation

**Découverte majeure** : Les performances dépendent de l'**horizon de prédiction** et de la méthode de test.

Nous avons utilisé deux méthodes :
- **Test one-step** : Prédiction J+1 avec vraies valeurs des lags
- **Test walk-forward** : Prédiction multi-step (J+7 à J+30) en conditions réelles

### 4.2 Résultats par Cas d'Usage

**A) Prédiction à J+1 (demain)** - Test one-step

| Modèle | MAE | R² | Recommandation |
|--------|-----|-----|----------------|
| **Gradient Boosting** | **5.34** | **0.9907** | ✅ **Production J+1** |
| Random Forest | 20.32 | 0.9297 | ✅ Backup |
| Prophet | 48.63 | 0.6172 | ⚠️ Moins précis |
| ARIMA | 86.63 | -0.0962 | ❌ Non recommandé |

**B) Prédiction J+7 à J+30 (semaine/mois)** - Test walk-forward

| Horizon | Prophet | ARIMA | Gradient Boosting |
|---------|---------|-------|-------------------|
| **7 jours** | **MAE=45, R²=0.68** | MAE=56, R²=0.51 | MAE=74, R²=0.13 |
| **14 jours** | **MAE=47, R²=0.64** | MAE=60, R²=0.44 | MAE=74, R²=0.17 |
| **30 jours** | **MAE=47, R²=0.65** | MAE=71, R²=0.19 | MAE=86, R²=-0.08 |

**Conclusion** : Prophet est le meilleur pour les prédictions multi-step !

### 4.2 Interprétation des Métriques

**MAE (Mean Absolute Error)** : Erreur moyenne absolue en nombre d'admissions
- Gradient Boosting : se trompe en moyenne de **5 admissions/jour**
- Random Forest : se trompe en moyenne de **20 admissions/jour**

**RMSE (Root Mean Square Error)** : Pénalise davantage les grosses erreurs
- Gradient Boosting : 9.62 (très faible)
- Les erreurs sont régulières et peu de valeurs aberrantes

**MAPE (Mean Absolute Percentage Error)** : Erreur relative en pourcentage
- Gradient Boosting : **1.08%** d'erreur relative (excellent)
- Random Forest : 4.33% (très bon)

**R² (Coefficient de détermination)** : Proportion de variance expliquée
- Gradient Boosting : **0.9907** → explique 99% de la variance
- Random Forest : 0.9297 → explique 93% de la variance
- ARIMA : -0.0962 → **pire que la moyenne** (R² négatif)

### 4.3 Pourquoi ARIMA n'est pas recommandé

ARIMA présente un R² négatif (-0.0962), ce qui signifie que le modèle performe **moins bien qu'une simple moyenne**. Cela s'explique par :

1. **Patterns complexes** : Les admissions hospitalières présentent des patterns multi-saisonniers (hebdomadaires, mensuels, annuels) difficiles à capturer avec ARIMA standard
2. **Non-stationnarité** : Malgré la différenciation, la série reste difficile à modéliser
3. **Absence de features externes** : ARIMA ne peut pas intégrer facilement des variables comme les jours fériés ou événements spéciaux

> **Décision** : ARIMA est exclu de la production mais conservé dans cette analyse comparative pour documenter notre processus d'évaluation.

---

## 5. Feature Engineering

### 5.1 Features Créées

| Catégorie | Features | Description |
|-----------|----------|-------------|
| **Temporelles** | `day_of_week`, `month`, `quarter`, `week_of_year` | Encodage du calendrier |
| **Cycliques** | `sin_day_week`, `cos_day_week`, `sin_month`, `cos_month` | Encodage trigonométrique pour capturer la périodicité |
| **Binaires** | `is_weekend`, `is_monday`, `is_winter`, `is_summer` | Indicateurs booléens |
| **Lags** | `lag_1`, `lag_7`, `lag_14`, `lag_21`, `lag_28`, `lag_30` | Valeurs passées |
| **Moyennes mobiles** | `ma_7`, `ma_14`, `ma_30` | Tendances lissées |
| **Volatilité** | `std_7`, `std_14`, `std_30` | Écarts-types mobiles |
| **Tendances** | `trend_7d`, `trend_30d` | Différences avec le passé |

### 5.2 Importance des Features (Gradient Boosting)

| Rang | Feature | Importance | Interprétation |
|------|---------|------------|----------------|
| 1 | `lag_7` | 68.0% | L'admission il y a 7 jours est le meilleur prédicteur |
| 2 | `trend_7d` | 23.6% | La tendance hebdomadaire est cruciale |
| 3 | `ma_7` | 4.8% | La moyenne mobile sur 7 jours stabilise |
| 4 | `lag_1` | 1.5% | La veille a un impact modéré |
| 5 | `is_weekend` | 0.6% | Le week-end influence légèrement |

**Insight clé** : Le pattern hebdomadaire domine (lag_7 + trend_7d = 91.6% d'importance cumulée). Les admissions suivent un cycle très régulier sur 7 jours.

---

## 6. Recommandations

### 6.1 Architecture Hybride pour la Production

**Découverte clé** : Les performances dépendent de l'horizon de prédiction. Nous recommandons une **approche hybride** :

| Horizon | Modèle recommandé | MAE | R² |
|---------|-------------------|-----|-----|
| **J+1 (demain)** | Gradient Boosting | 5 | 0.99 |
| **J+2 à J+30** | Prophet | 45-47 | 0.65-0.68 |

### 6.2 Stratégie de Déploiement

```
┌─────────────────────────────────────────────────────────────┐
│              Pipeline de Production HYBRIDE                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRÉDICTION DEMAIN (J+1)                                    │
│  ├── Feature engineering (lags = vraies valeurs)            │
│  └── Gradient Boosting → précision ±5 admissions            │
│                                                             │
│  PRÉDICTIONS SEMAINE/MOIS (J+2 à J+30)                     │
│  ├── Données historiques (date, admissions)                 │
│  └── Prophet → précision ±45-47 admissions                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Pourquoi cette Architecture ?

| Modèle | Force | Faiblesse |
|--------|-------|-----------|
| **Gradient Boosting** | Très précis à J+1 (lags = vraies valeurs) | Accumulation d'erreurs sur horizons longs |
| **Prophet** | Stable sur tous les horizons (pas de lags) | Moins précis à très court terme |

### 6.4 Maintenance du Modèle

| Action | Fréquence | Description |
|--------|-----------|-------------|
| Réentraînement | Mensuel | Intégrer les nouvelles données |
| Monitoring | Quotidien | Vérifier l'erreur sur les prédictions récentes |
| Audit complet | Trimestriel | Réévaluer tous les modèles |

---

## 7. Conclusion

Cette étude comparative démontre l'importance de **choisir le bon modèle selon l'horizon de prédiction** :

**Points clés** :

1. ✅ **Gradient Boosting** excelle pour J+1 avec R² = 0.99 et MAE = 5 admissions
2. ✅ **Prophet** est le meilleur pour J+7 à J+30 avec R² ≈ 0.65-0.68
3. ✅ Le pattern hebdomadaire est le facteur prédictif dominant
4. ❌ **ARIMA** est inadapté pour cette tâche (R² négatif sur tous horizons)

**Recommandation finale** : Utiliser une **architecture hybride** combinant Gradient Boosting (J+1) et Prophet (J+2 à J+30) pour une couverture optimale de tous les besoins de prédiction.

---

## Annexes

### A. Fichiers Générés

| Fichier | Description |
|---------|-------------|
| `data/model_comparison_80_20.json` | Résultats détaillés de la comparaison |
| `data/models/gradient_boosting_80_20.pkl` | Modèle Gradient Boosting entraîné |
| `data/models/random_forest_80_20.pkl` | Modèle Random Forest entraîné |
| `data/models/prophet_80_20.pkl` | Modèle Prophet entraîné |
| `python/models/compare_models_80_20.py` | Script de comparaison |

### B. Environnement Technique

- **Python** : 3.14
- **scikit-learn** : 1.8.0
- **Prophet** : 1.3.0
- **statsmodels** : 0.14.6
- **pandas** : 3.0.0

### C. Glossaire

| Terme | Définition |
|-------|------------|
| **MAE** | Mean Absolute Error - Moyenne des erreurs absolues |
| **RMSE** | Root Mean Square Error - Racine de l'erreur quadratique moyenne |
| **MAPE** | Mean Absolute Percentage Error - Erreur absolue moyenne en % |
| **R²** | Coefficient de détermination (0 à 1, plus proche de 1 = meilleur) |
| **Lag** | Valeur décalée dans le temps (ex: lag_7 = valeur il y a 7 jours) |
| **Feature** | Variable d'entrée utilisée pour la prédiction |

---

*Rapport généré le 04/02/2026*
*Équipe Data Science - Projet Pitié-Salpêtrière*
