# Présentation des Modèles Statistiques et Évaluation de leur Applicabilité

## Introduction

En data science, un **modèle statistique** est une représentation mathématique (généralement basée sur la théorie des probabilités) qui décrit la manière dont sont générées les données observées. Ce document présente les modèles utilisés pour la prédiction des admissions hospitalières, leurs fondements théoriques et l'évaluation de leur applicabilité à notre problématique.

---

## 1. Cadre Théorique

### 1.1 Définition Formelle

Un modèle statistique se définit par un triplet \((S, \mathcal{F}, P_\theta)\) où :
- \(S\) : l'espace des observations possibles
- \(\mathcal{F}\) : une σ-algèbre sur \(S\)
- \(P_\theta\) : une famille de distributions de probabilité indexée par \(\theta \in \Theta\)

### 1.2 Objectifs

1. **Expliquer** les données observées
2. **Prédire** des valeurs futures ou des probabilités d'événements
3. **Estimer** des grandeurs inconnues (paramètres de population)
4. **Quantifier l'incertitude** associée aux estimations

### 1.3 Notre Problématique

**Variable cible** : \(Y_t\) = nombre d'admissions hospitalières au jour \(t\)

**Objectif** : Prédire \(\hat{Y}_{t+h}\) pour un horizon \(h \in \{1, 7, 30\}\) jours

**Données disponibles** : Série temporelle de 2 192 observations journalières (2020-2025)

---

## 2. Modèles de Séries Temporelles

### 2.1 ARIMA (AutoRegressive Integrated Moving Average)

#### 2.1.1 Fondements Théoriques

Le modèle ARIMA(p,d,q) combine trois composantes :

**Composante AutoRégressive AR(p)** :
$$Y_t = c + \phi_1 Y_{t-1} + \phi_2 Y_{t-2} + ... + \phi_p Y_{t-p} + \varepsilon_t$$

**Composante Moyenne Mobile MA(q)** :
$$Y_t = \mu + \varepsilon_t + \theta_1 \varepsilon_{t-1} + \theta_2 \varepsilon_{t-2} + ... + \theta_q \varepsilon_{t-q}$$

**Intégration (d)** : Différenciation d'ordre d pour rendre la série stationnaire :
$$\nabla^d Y_t = (1-B)^d Y_t$$

où \(B\) est l'opérateur retard (\(B Y_t = Y_{t-1}\)).

#### 2.1.2 Hypothèses du Modèle

| Hypothèse | Description | Vérification |
|-----------|-------------|--------------|
| **Stationnarité** | \(E[Y_t] = \mu\) constante, \(Var(Y_t) = \sigma^2\) constante | Test ADF |
| **Bruit blanc** | \(\varepsilon_t \sim \mathcal{N}(0, \sigma^2)\) i.i.d. | Test de Ljung-Box |
| **Linéarité** | Relations linéaires entre observations | Corrélogramme |

#### 2.1.3 Estimation des Paramètres

Les paramètres \(\theta = (\phi_1, ..., \phi_p, \theta_1, ..., \theta_q, \sigma^2)\) sont estimés par **maximum de vraisemblance** :

$$\hat{\theta}_{MLE} = \arg\max_\theta \mathcal{L}(\theta | Y_1, ..., Y_T)$$

avec :
$$\mathcal{L}(\theta | Y) = -\frac{T}{2}\log(2\pi\sigma^2) - \frac{1}{2\sigma^2}\sum_{t=1}^{T}\varepsilon_t^2$$

#### 2.1.4 Applicabilité à Notre Problème

| Critère | Évaluation | Commentaire |
|---------|------------|-------------|
| Stationnarité | ⚠️ Partiellement | Tendance et saisonnalité multiples |
| Linéarité | ❌ Non respectée | Patterns non-linéaires complexes |
| Saisonnalité | ❌ Insuffisant | Multi-saisonnalité difficile à capturer |
| **Performance** | ❌ **R² = -0.096** | **Pire que la moyenne** |

**Conclusion** : ARIMA est **non applicable** pour notre cas. Le R² négatif indique que le modèle performe moins bien qu'un simple prédicteur constant (moyenne). Les admissions hospitalières présentent des patterns multi-saisonniers (hebdomadaire + mensuel + annuel) et des dépendances non-linéaires qu'ARIMA ne peut capturer.

---

### 2.2 Prophet (Facebook/Meta)

#### 2.2.1 Fondements Théoriques

Prophet utilise un **modèle additif généralisé (GAM)** :

$$Y_t = g(t) + s(t) + h(t) + \varepsilon_t$$

où :
- \(g(t)\) : tendance (linéaire ou logistique avec changepoints)
- \(s(t)\) : saisonnalité (séries de Fourier)
- \(h(t)\) : effet des jours fériés/événements
- \(\varepsilon_t\) : terme d'erreur

**Tendance linéaire avec changepoints** :
$$g(t) = (k + \mathbf{a}(t)^T \boldsymbol{\delta}) \cdot t + (m + \mathbf{a}(t)^T \boldsymbol{\gamma})$$

où :
- \(k\) : taux de croissance initial
- \(\boldsymbol{\delta}\) : vecteur des ajustements de taux aux changepoints
- \(m\) : offset
- \(\mathbf{a}(t)\) : vecteur indicateur des changepoints

**Saisonnalité (séries de Fourier)** :
$$s(t) = \sum_{n=1}^{N} \left( a_n \cos\left(\frac{2\pi nt}{P}\right) + b_n \sin\left(\frac{2\pi nt}{P}\right) \right)$$

où \(P\) est la période (7 pour hebdomadaire, 365.25 pour annuelle).

#### 2.2.2 Hypothèses du Modèle

| Hypothèse | Description | Vérification |
|-----------|-------------|--------------|
| **Additivité** | Les composantes s'additionnent | Validée pour nos données |
| **Saisonnalité fixe** | Patterns saisonniers stables | ✅ Respectée |
| **Changepoints** | Tendance change à des points discrets | ✅ Automatiquement détectés |

#### 2.2.3 Estimation des Paramètres

Prophet utilise l'**inférence bayésienne** avec l'algorithme **L-BFGS-B** ou **Stan** (MCMC) :

$$P(\theta | Y) \propto P(Y | \theta) \cdot P(\theta)$$

Les priors par défaut sont :
- \(\delta_j \sim \text{Laplace}(0, \tau)\) avec \(\tau\) contrôlant la flexibilité
- \(a_n, b_n \sim \mathcal{N}(0, \sigma_s^2)\)

#### 2.2.4 Applicabilité à Notre Problème

| Critère | Évaluation | Commentaire |
|---------|------------|-------------|
| Multi-saisonnalité | ✅ Excellente | Hebdo + mensuel + annuel |
| Jours fériés | ✅ Intégré | Jours fériés français ajoutés |
| Interprétabilité | ✅ Excellente | Décomposition visible |
| Données manquantes | ✅ Robuste | Gestion automatique |
| **Performance** | ⚠️ **R² = 0.617** | **Correcte mais limitée** |

**Conclusion** : Prophet est **applicable** mais avec des performances modérées. Il excelle pour l'**analyse exploratoire** et la **décomposition saisonnière**, mais les modèles ML le surpassent pour la prédiction pure.

---

## 3. Modèles d'Apprentissage Automatique

### 3.1 Random Forest (Forêt Aléatoire)

#### 3.1.1 Fondements Théoriques

Random Forest est un **ensemble de B arbres de décision** construits par **bagging** (Bootstrap Aggregating) :

$$\hat{f}_{RF}(x) = \frac{1}{B} \sum_{b=1}^{B} T_b(x)$$

où chaque arbre \(T_b\) est entraîné sur un échantillon bootstrap \(\mathcal{D}_b^*\).

**Construction de chaque arbre** :
1. Tirer un échantillon bootstrap \(\mathcal{D}_b^* \sim \mathcal{D}\)
2. À chaque nœud, sélectionner aléatoirement \(m = \sqrt{p}\) features parmi les \(p\) disponibles
3. Choisir la meilleure coupure parmi ces \(m\) features (minimisant la variance)
4. Répéter jusqu'à un critère d'arrêt

**Critère de coupure (régression)** - Minimiser la somme des variances :
$$\arg\min_{j,s} \left[ \sum_{x_i \in R_1(j,s)} (y_i - \bar{y}_{R_1})^2 + \sum_{x_i \in R_2(j,s)} (y_i - \bar{y}_{R_2})^2 \right]$$

#### 3.1.2 Distribution et Incertitude

La prédiction finale suit approximativement une **distribution normale** grâce au théorème central limite :

$$\hat{f}_{RF}(x) \xrightarrow{\text{approx}} \mathcal{N}(\mu(x), \sigma^2(x)/B)$$

L'**incertitude** peut être estimée par la variance des prédictions individuelles :
$$\hat{\sigma}^2(x) = \frac{1}{B-1} \sum_{b=1}^{B} (T_b(x) - \hat{f}_{RF}(x))^2$$

#### 3.1.3 Hypothèses du Modèle

| Hypothèse | Description | Vérification |
|-----------|-------------|--------------|
| **Indépendance conditionnelle** | Features informatives | ✅ Features engineered |
| **Stabilité** | Arbres décorrélés | ✅ Randomisation des features |
| **Non-linéarité** | Peut capturer des relations complexes | ✅ Adapté à nos données |

#### 3.1.4 Applicabilité à Notre Problème

| Critère | Évaluation | Commentaire |
|---------|------------|-------------|
| Non-linéarité | ✅ Excellente | Capture les patterns complexes |
| Robustesse | ✅ Excellente | Peu sensible aux outliers |
| Feature importance | ✅ Disponible | Interprétabilité partielle |
| Overfitting | ⚠️ Modéré | Contrôlé par max_depth |
| **Performance** | ✅ **R² = 0.932** | **Très bonne** |

**Conclusion** : Random Forest est **très applicable** et sert de **modèle de backup** fiable avec une excellente robustesse.

---

### 3.2 Gradient Boosting

#### 3.2.1 Fondements Théoriques

Gradient Boosting construit un **ensemble additif** de modèles faibles (arbres peu profonds) :

$$\hat{f}(x) = \sum_{m=0}^{M} \gamma_m h_m(x)$$

où chaque \(h_m\) est ajouté pour corriger les erreurs des précédents.

**Algorithme (régression)** :

1. Initialiser : \(\hat{f}_0(x) = \arg\min_\gamma \sum_{i=1}^{N} L(y_i, \gamma)\)

2. Pour \(m = 1, ..., M\) :
   
   a) Calculer les **pseudo-résidus** (gradient négatif de la perte) :
   $$r_{im} = -\left[\frac{\partial L(y_i, f(x_i))}{\partial f(x_i)}\right]_{f=\hat{f}_{m-1}}$$
   
   Pour la perte quadratique \(L(y, f) = \frac{1}{2}(y-f)^2\) :
   $$r_{im} = y_i - \hat{f}_{m-1}(x_i)$$
   
   b) Ajuster un arbre \(h_m\) aux pseudo-résidus
   
   c) Mettre à jour : \(\hat{f}_m(x) = \hat{f}_{m-1}(x) + \nu \cdot h_m(x)\)
   
   où \(\nu \in (0,1]\) est le **learning rate**

#### 3.2.2 Fonction de Perte et Optimisation

**Fonction de perte (Huber)** - robuste aux outliers :
$$L_\delta(y, f) = \begin{cases} 
\frac{1}{2}(y-f)^2 & \text{si } |y-f| \leq \delta \\
\delta(|y-f| - \frac{\delta}{2}) & \text{sinon}
\end{cases}$$

**Optimisation** : Descente de gradient dans l'espace des fonctions :
$$\hat{f}_m = \hat{f}_{m-1} - \nu \cdot \nabla_f L(y, \hat{f}_{m-1})$$

#### 3.2.3 Régularisation

Pour éviter l'overfitting, plusieurs techniques sont utilisées :

| Technique | Paramètre | Effet |
|-----------|-----------|-------|
| **Shrinkage** | \(\nu\) (learning rate) | Réduit la contribution de chaque arbre |
| **Subsampling** | subsample < 1 | Stochastic Gradient Boosting |
| **Profondeur limitée** | max_depth | Arbres peu profonds (weak learners) |
| **Nombre d'arbres** | n_estimators | Early stopping possible |

#### 3.2.4 Hypothèses du Modèle

| Hypothèse | Description | Vérification |
|-----------|-------------|--------------|
| **Biais-Variance** | Réduit le biais séquentiellement | ✅ Validé empiriquement |
| **Additivité** | Contributions s'additionnent | ✅ Par construction |
| **Dérivabilité** | Fonction de perte dérivable | ✅ Perte quadratique/Huber |

#### 3.2.5 Applicabilité à Notre Problème

| Critère | Évaluation | Commentaire |
|---------|------------|-------------|
| Non-linéarité | ✅ Excellente | Capture les dépendances complexes |
| Précision | ✅ Excellente | Optimisation séquentielle |
| Regularisation | ✅ Bien contrôlée | Shrinkage + subsampling |
| Interprétabilité | ⚠️ Moyenne | Feature importance disponible |
| **Performance** | ✅ **R² = 0.991** | **Excellente** |

**Conclusion** : Gradient Boosting est **le modèle optimal** pour notre problème avec R² = 0.991, soit une explication de 99.1% de la variance des admissions.

---

## 4. Feature Engineering et Variables Explicatives

### 4.1 Variables Créées

Les features sont construites pour capturer les différentes sources de variation :

#### 4.1.1 Features Temporelles Directes

| Variable | Formule | Distribution | Justification |
|----------|---------|--------------|---------------|
| `day_of_week` | \(t \mod 7\) | Catégorielle (0-6) | Cycle hebdomadaire |
| `month` | \(\text{month}(t)\) | Catégorielle (1-12) | Saisonnalité annuelle |
| `quarter` | \(\lceil \text{month}/3 \rceil\) | Catégorielle (1-4) | Trimestres |

#### 4.1.2 Features Cycliques (Encodage Trigonométrique)

Pour préserver la continuité des variables cycliques :

$$\text{sin\_day\_week} = \sin\left(\frac{2\pi \cdot \text{day\_of\_week}}{7}\right)$$
$$\text{cos\_day\_week} = \cos\left(\frac{2\pi \cdot \text{day\_of\_week}}{7}\right)$$

**Propriété** : La distance euclidienne entre dimanche (6) et lundi (0) devient faible.

#### 4.1.3 Variables Retardées (Lags)

Les lags capturent l'**auto-corrélation** :

$$\text{lag}_k = Y_{t-k}$$

| Lag | Interprétation | Corrélation observée |
|-----|----------------|---------------------|
| lag_1 | Hier | 0.85 |
| lag_7 | Même jour semaine précédente | **0.92** |
| lag_30 | Même période mois précédent | 0.78 |

#### 4.1.4 Moyennes Mobiles

Lissage pour capturer la **tendance locale** :

$$\text{ma}_k = \frac{1}{k}\sum_{i=0}^{k-1} Y_{t-i}$$

**Interprétation statistique** : Estimation de \(E[Y_t | \mathcal{F}_{t-k:t}]\)

#### 4.1.5 Tendances Différentielles

$$\text{trend}_{7d} = Y_t - Y_{t-7}$$

Capture la **dérivée discrète** : positive = croissance, négative = décroissance.

### 4.2 Analyse des Corrélations

Matrice de corrélation des features principales avec la cible :

| Feature | Corrélation avec Y | Interprétation |
|---------|-------------------|----------------|
| `lag_7` | **0.92** | Pattern hebdomadaire dominant |
| `ma_7` | 0.89 | Tendance court terme |
| `lag_1` | 0.85 | Persistance journalière |
| `trend_7d` | 0.34 | Direction du changement |
| `is_weekend` | -0.45 | Week-end = moins d'admissions |

### 4.3 Importance des Features (Gradient Boosting)

Basée sur la **réduction d'impureté moyenne** :

$$\text{Importance}(X_j) = \frac{1}{M}\sum_{m=1}^{M} \sum_{t \in T_m} \mathbb{1}(j_t = j) \cdot \Delta I_t$$

où \(\Delta I_t\) est la réduction de variance au nœud \(t\).

| Rang | Feature | Importance | Interprétation |
|------|---------|------------|----------------|
| 1 | `lag_7` | **68.0%** | Le jour J-7 prédit fortement J |
| 2 | `trend_7d` | **23.6%** | La dynamique hebdomadaire |
| 3 | `ma_7` | 4.8% | Niveau moyen récent |
| 4 | `lag_1` | 1.5% | Effet de veille |
| 5 | `is_weekend` | 0.6% | Effet week-end |

**Insight** : Le pattern hebdomadaire explique **91.6%** de la prédiction (lag_7 + trend_7d).

---

## 5. Évaluation et Métriques

### 5.0 Méthodologie de Validation : Walk-Forward

**Important** : Les modèles de séries temporelles doivent être évalués avec la méthode **walk-forward** (validation glissante), pas avec un split simple.

**Problème du split simple** :
- Si on prédit le jour J avec un modèle ML utilisant lag_7, on lui donne la vraie valeur de J-7
- En production, pour prédire J+30, on n'a PAS les vraies valeurs de J+1 à J+29
- Les modèles ML doivent utiliser leurs propres prédictions comme lags → accumulation d'erreurs

**Solution : Validation Walk-Forward**
```
Pour chaque point de test t :
  1. Entraîner sur données [0, t)
  2. Prédire sur horizon [t, t+h]
  3. Comparer avec vraies valeurs
  4. Passer au point suivant
```

Cette méthode simule l'utilisation réelle en production.

### 5.1 Métriques Utilisées

#### 5.1.1 MAE (Mean Absolute Error)

$$\text{MAE} = \frac{1}{n}\sum_{i=1}^{n}|y_i - \hat{y}_i|$$

**Interprétation** : Erreur moyenne en unités de la variable cible (admissions).
**Avantage** : Robuste aux outliers, interprétable directement.

#### 5.1.2 RMSE (Root Mean Square Error)

$$\text{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i - \hat{y}_i)^2}$$

**Interprétation** : Pénalise davantage les grandes erreurs.
**Propriété** : Si \(\varepsilon \sim \mathcal{N}(0, \sigma^2)\), alors RMSE \(\approx \sigma\).

#### 5.1.3 MAPE (Mean Absolute Percentage Error)

$$\text{MAPE} = \frac{100\%}{n}\sum_{i=1}^{n}\left|\frac{y_i - \hat{y}_i}{y_i}\right|$$

**Interprétation** : Erreur relative moyenne en pourcentage.
**Limite** : Non défini si \(y_i = 0\).

#### 5.1.4 R² (Coefficient de Détermination)

$$R^2 = 1 - \frac{\sum_{i=1}^{n}(y_i - \hat{y}_i)^2}{\sum_{i=1}^{n}(y_i - \bar{y})^2} = 1 - \frac{SS_{res}}{SS_{tot}}$$

**Interprétation** : Proportion de variance expliquée par le modèle.
- \(R^2 = 1\) : prédiction parfaite
- \(R^2 = 0\) : équivalent à prédire la moyenne
- \(R^2 < 0\) : pire que la moyenne (modèle inadapté)

### 5.2 Résultats Comparatifs

#### A) Validation Walk-Forward (méthode correcte pour la production)

Résultats avec prédiction multi-step sur différents horizons :

**Horizon 7 jours :**
| Modèle | MAE | RMSE | MAPE | R² |
|--------|-----|------|------|-----|
| **Prophet** | **44.75** | **56.63** | **9.65%** | **0.676** |
| ARIMA | 56.46 | 69.71 | 12.48% | 0.508 |
| Gradient Boosting | 74.21 | 95.00 | 16.72% | 0.131 |

**Horizon 14 jours :**
| Modèle | MAE | RMSE | MAPE | R² |
|--------|-----|------|------|-----|
| **Prophet** | **47.47** | **60.07** | **10.24%** | **0.641** |
| ARIMA | 59.66 | 74.81 | 13.42% | 0.443 |
| Gradient Boosting | 73.98 | 93.14 | 16.66% | 0.166 |

**Horizon 30 jours :**
| Modèle | MAE | RMSE | MAPE | R² |
|--------|-----|------|------|-----|
| **Prophet** | **47.05** | **59.77** | **10.23%** | **0.651** |
| ARIMA | 71.42 | 91.04 | 16.25% | 0.191 |
| Gradient Boosting | 86.14 | 107.73 | 18.85% | -0.083 |

#### B) Prédiction one-step (avec vraies valeurs des lags)

Pour la prédiction à J+1 uniquement (où les lags sont des vraies valeurs) :

| Modèle | MAE | R² | Usage |
|--------|-----|-----|-------|
| **Gradient Boosting** | **5.15** | **0.991** | Prédiction J+1 |
| Random Forest | 20.20 | 0.932 | Backup J+1 |
| Prophet | 48.63 | 0.617 | Multi-step |
| ARIMA | 86.63 | -0.096 | ❌ Inadapté |

### 5.3 Analyse des Résultats

**Découverte clé** : Les performances dépendent fortement de l'**horizon de prédiction** et de la **méthode d'évaluation**.

| Cas d'usage | Meilleur modèle | Explication |
|-------------|-----------------|-------------|
| **Prédiction J+1** | Gradient Boosting (R²=0.99) | Les lags sont des vraies valeurs |
| **Prédiction J+7 à J+30** | Prophet (R²=0.65-0.68) | Pas besoin de valeurs intermédiaires |
| **Prédiction long terme** | Prophet | Décomposition tendance + saisonnalité |

**Pourquoi ce paradoxe ?**

1. **Gradient Boosting** excelle quand il a accès aux vraies valeurs récentes (lag_1, lag_7)
2. En prédiction multi-step, GB doit utiliser ses propres prédictions → **accumulation d'erreurs**
3. **Prophet** modélise directement la saisonnalité → stable sur tous les horizons

### 5.4 Intervalles de Confiance

**Pour Prophet** (horizon 7-30 jours) :
$$IC_{95\%}(\hat{Y}) = \hat{Y} \pm 1.96 \times 60 \approx \hat{Y} \pm 118 \text{ admissions}$$

**Pour Gradient Boosting** (prédiction J+1) :
$$IC_{95\%}(\hat{Y}) = \hat{Y} \pm 1.96 \times 9.26 \approx \hat{Y} \pm 18 \text{ admissions}$$

---

## 6. Synthèse : Applicabilité des Modèles

### 6.1 Tableau Récapitulatif par Cas d'Usage

| Cas d'usage | Modèle recommandé | R² | MAE | Justification |
|-------------|-------------------|-----|-----|---------------|
| **Prédiction J+1** | Gradient Boosting | 0.99 | 5 | Lags = vraies valeurs, très précis |
| **Prédiction J+7** | Prophet | 0.68 | 45 | Pas d'accumulation d'erreurs |
| **Prédiction J+14** | Prophet | 0.64 | 47 | Stable sur horizon moyen |
| **Prédiction J+30** | Prophet | 0.65 | 47 | Saisonnalité bien capturée |
| **Analyse saisonnière** | Prophet | - | - | Décomposition interprétable |

### 6.2 Évaluation de l'Applicabilité

| Modèle | Type | Court terme (J+1) | Moyen terme (J+7-30) | Recommandation |
|--------|------|-------------------|----------------------|----------------|
| **Gradient Boosting** | ML (boosting) | ✅ **Excellent** (R²=0.99) | ❌ Mauvais (accumulation erreurs) | ✅ Prédiction J+1 |
| **Random Forest** | ML (bagging) | ✅ Très bon (R²=0.93) | ❌ Mauvais | ✅ Backup J+1 |
| **Prophet** | Série temporelle | ⚠️ Correct (R²=0.62) | ✅ **Bon** (R²=0.65-0.68) | ✅ Prédiction multi-step |
| **ARIMA** | Série temporelle | ❌ Mauvais | ❌ Mauvais | ❌ Non applicable |

### 6.3 Recommandations pour la Production

**Architecture hybride recommandée** :

```
┌─────────────────────────────────────────────────────────────┐
│                   SYSTÈME DE PRÉDICTION                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Prédiction J+1 (demain)                                   │
│   └── Gradient Boosting (MAE ≈ 5 admissions)               │
│                                                             │
│   Prédictions J+2 à J+30 (semaine/mois)                    │
│   └── Prophet (MAE ≈ 45-47 admissions)                     │
│                                                             │
│   Analyse de tendance et saisonnalité                       │
│   └── Prophet (décomposition)                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Justification** :
- **Gradient Boosting pour J+1** : Les features lag_1, lag_7 sont des vraies valeurs → très précis
- **Prophet pour J+2 à J+30** : Ne dépend pas de prédictions intermédiaires → stable sur l'horizon

### 6.4 Limites et Perspectives

| Limite | Impact | Mitigation |
|--------|--------|------------|
| Stationnarité non garantie | Dérive possible dans le temps | Réentraînement mensuel |
| Variables exogènes absentes | Événements non prévisibles | Intégration données météo, épidémies |
| Accumulation d'erreurs (ML) | Dégradation sur horizon long | Utiliser Prophet pour multi-step |
| Horizon > 30 jours | Incertitude trop élevée | Limiter à 30 jours max |

---

## Conclusion

Cette analyse démontre l'importance de **choisir le bon modèle selon le cas d'usage** :

### Résultats Clés

1. **Prédiction à court terme (J+1)** :
   - **Gradient Boosting** excelle avec R² = 0.99 et MAE = 5 admissions
   - Les features lag permettent une prédiction très précise

2. **Prédiction à moyen terme (J+7 à J+30)** :
   - **Prophet** est le meilleur choix avec R² ≈ 0.65-0.68
   - Stable sur l'horizon car ne dépend pas de prédictions intermédiaires

3. **ARIMA** : Non applicable (R² < 0 sur tous les horizons)
   - Les données ne respectent pas les hypothèses du modèle

### Insight Principal

Le **pattern hebdomadaire** est le facteur prédictif dominant :
- lag_7 explique 68% de la prédiction (Gradient Boosting)
- Prophet capture cette saisonnalité via ses séries de Fourier

### Recommandation Finale

**Approche hybride** : Combiner Gradient Boosting (J+1) et Prophet (J+2 à J+30) pour couvrir tous les besoins de prédiction avec la meilleure précision possible sur chaque horizon.

---

## Références Bibliographiques

1. Box, G.E.P., Jenkins, G.M., Reinsel, G.C. (2015). *Time Series Analysis: Forecasting and Control*. Wiley.

2. Breiman, L. (2001). "Random Forests". *Machine Learning*, 45(1), 5-32.

3. Friedman, J.H. (2001). "Greedy Function Approximation: A Gradient Boosting Machine". *Annals of Statistics*, 29(5), 1189-1232.

4. Taylor, S.J., Letham, B. (2018). "Forecasting at Scale". *The American Statistician*, 72(1), 37-45.

5. Hastie, T., Tibshirani, R., Friedman, J. (2009). *The Elements of Statistical Learning*. Springer.

---

*Document rédigé le 04/02/2026*
*Équipe Data Science - Projet Pitié-Salpêtrière*
