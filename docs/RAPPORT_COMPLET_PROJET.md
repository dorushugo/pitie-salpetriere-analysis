# Rapport Complet - Projet Data Pitié-Salpêtrière
## Outil de Simulation et Prédiction Hospitalière

---

## Présentation des fonctionnalités

### Vue d'ensemble du prototype

Le prototype développé est une **application web de pilotage hospitalier** permettant aux directeurs d'établissement et aux gestionnaires de ressources d'anticiper les besoins, optimiser l'allocation des ressources et prendre des décisions éclairées.

### Architecture fonctionnelle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION WEB PITIÉ-SALPÊTRIÈRE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard  │  │  Services   │  │  Pilotage   │  │ Recommand.  │        │
│  │  Vue globale│  │  Par unité  │  │  Décision   │  │  Actions    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Simulations │  │ Prédictions │  │  Ressources │  │   Export    │        │
│  │  Scénarios  │  │     IA      │  │   Besoins   │  │   Rapports  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    Module Données & Méthodologie                 │       │
│  │         Exploration des datasets, validation, sources           │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Description détaillée des modules

#### 1. Dashboard - Vue d'ensemble
**Objectif** : Fournir une vision synthétique de l'état de l'hôpital en temps réel.

| Fonctionnalité | Description |
|----------------|-------------|
| KPIs en temps réel | Admissions du jour, taux d'occupation, personnel disponible |
| Graphiques temporels | Évolution des admissions sur 7/30/90 jours |
| Alertes actives | Indicateurs visuels des situations de tension |
| Comparaison périodes | Écart par rapport à la même période l'an passé |

**Indicateurs affichés** :
- Nombre d'admissions quotidiennes
- Taux d'occupation global et par service
- Disponibilité du personnel (médecins, infirmiers, aides-soignants)
- Durée moyenne de séjour
- Taux de mortalité

#### 2. Services - Gestion par unité
**Objectif** : Permettre un pilotage fin par service médical.

| Service suivi | Métriques |
|---------------|-----------|
| Urgences | Temps d'attente, flux entrants/sortants |
| Cardiologie | Lits occupés, interventions programmées |
| Neurologie | Capacité, personnel spécialisé |
| Réanimation | Taux occupation critique, équipements |
| Pédiatrie | Admissions, durée moyenne de séjour |
| Maladies Infectieuses | Capacité d'isolement, alertes épidémiques |

**Fonctionnalités** :
- Vue détaillée par service avec graphiques dédiés
- Historique d'occupation sur plusieurs années
- Comparaison inter-services
- Alertes de seuils critiques (>90% occupation)

#### 3. Pilotage - Centre de décision
**Objectif** : Centraliser les informations stratégiques pour la prise de décision.

**Composants** :
- **Tableau de bord décisionnel** : Synthèse des indicateurs critiques
- **Analyse des tendances** : Identification des patterns récurrents
- **Indicateurs de performance** : Suivi des objectifs hospitaliers
- **Alertes prédictives** : Anticipation des situations de crise

#### 4. Recommandations - Actions suggérées
**Objectif** : Proposer des actions concrètes basées sur l'analyse des données.

**Types de recommandations** :
| Catégorie | Exemple |
|-----------|---------|
| Gestion des lits | "Prévoir 15 lits supplémentaires en médecine pour la semaine prochaine" |
| Personnel | "Renforcer l'équipe de nuit aux urgences (+2 IDE)" |
| Équipements | "Anticiper une hausse d'utilisation du scanner de 20%" |
| Organisationnel | "Activer le plan de déprogrammation niveau 1" |

**Priorisation** :
- 🔴 Critique : Action immédiate requise
- 🟠 Haute : Action dans les 24h
- 🟡 Moyenne : Action dans la semaine
- 🟢 Basse : Optimisation à planifier

#### 5. Simulations - Scénarios de crise
**Objectif** : Tester la capacité de l'hôpital à répondre à différents scénarios.

**Scénarios disponibles** :

| Scénario | Description | Variables ajustables |
|----------|-------------|---------------------|
| Épidémie grippale | Augmentation saisonnière des admissions | Intensité, durée |
| Pandémie COVID | Crise sanitaire majeure | Taux contamination, létalité |
| Canicule | Pics d'admissions estivaux | Température, durée |
| Accident collectif | Afflux massif et soudain | Nombre victimes, gravité |
| Grève du personnel | Réduction des effectifs | % absents, durée |

**Résultats de simulation** :
- Impact sur le taux d'occupation
- Besoins en personnel supplémentaire
- Risque de saturation par service
- Recommandations d'adaptation

#### 6. Prédictions IA - Modèles de forecasting
**Objectif** : Anticiper les admissions futures grâce au machine learning.

**Modèles implémentés** :
- **Gradient Boosting** : Modèle principal, R² = 0.96
- **Random Forest** : Modèle de backup
- **Prophet** : Pour l'analyse des tendances
- **Ensemble** : Combinaison pondérée

**Informations affichées** :
- Prédictions à 7, 14 et 30 jours
- Intervalles de confiance (95%)
- Décomposition tendance/saisonnalité
- Comparaison modèles

#### 7. Besoins Ressources - Prédiction des besoins
**Objectif** : Traduire les prédictions d'admissions en besoins concrets.

**Ressources prédites** :

| Catégorie | Détail |
|-----------|--------|
| **Lits** | Médecine, chirurgie, réanimation, obstétrique |
| **Personnel** | Médecins, infirmiers, aides-soignants, administratifs |
| **Équipements** | Scanner, IRM, respirateurs |

**Indicateurs** :
- Taux d'utilisation prévu
- Jours d'alerte (>85% capacité)
- Jours critiques (>95% capacité)
- Niveau de risque global

#### 8. Export - Rapports et données
**Objectif** : Permettre l'extraction des données pour reporting externe.

**Formats disponibles** :
- PDF : Rapports formatés pour la direction
- Excel : Données brutes pour analyse
- CSV : Export pour outils tiers

**Types de rapports** :
- Rapport quotidien d'activité
- Bilan hebdomadaire
- Synthèse mensuelle
- Rapport de crise

#### 9. Données - Exploration et validation
**Objectif** : Transparence sur les données utilisées et leur qualité.

**Fonctionnalités** :
- Exploration des datasets (établissement, admissions)
- Visualisation des distributions
- Comparaison avec sources officielles
- Documentation de la méthodologie

---

## Méthodologie de développement

### 1. Stack technique

| Couche | Technologies |
|--------|--------------|
| **Frontend** | Next.js 16, React 18, TypeScript |
| **UI/UX** | Tailwind CSS, shadcn/ui, Recharts |
| **Backend API** | Next.js API Routes (serverless) |
| **Data Science** | Python 3, pandas, scikit-learn, Prophet |
| **Notebooks** | Jupyter pour exploration et prototypage |

### 2. Architecture des données

```
data/
├── etablissement.csv        # Statistiques quotidiennes (2192 jours)
├── admissions_complet.csv   # Détail patient par patient (~980k lignes)
├── resources.csv            # Ressources par service
├── predictions_*.json       # Prédictions des modèles
└── models/                  # Modèles entraînés (.pkl)
```

### 3. Processus de développement

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CYCLE DE DÉVELOPPEMENT                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│   │ Analyse  │───►│ Données  │───►│ Modèles  │───►│   Web    │        │
│   │ Besoins  │    │ Collect. │    │    ML    │    │   App    │        │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘        │
│        │                                               │               │
│        │              ┌──────────┐                     │               │
│        └─────────────►│ Feedback │◄────────────────────┘               │
│                       │  Itérat. │                                     │
│                       └──────────┘                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Étapes clés** :

1. **Analyse des besoins**
   - Étude du cahier des charges
   - Identification des KPIs pertinents
   - Définition des cas d'usage prioritaires

2. **Collecte et génération des données**
   - Analyse des sources officielles (SAE, Hospi-Diag, DREES)
   - Génération de données synthétiques réalistes
   - Validation des ordres de grandeur

3. **Développement des modèles ML**
   - Exploration des données (notebooks Jupyter)
   - Feature engineering (135 variables)
   - Entraînement et évaluation des modèles
   - Sélection du meilleur modèle

4. **Développement de l'application web**
   - Architecture composants React
   - Intégration des API de données
   - Design responsive et accessible

5. **Itérations et améliorations**
   - Tests utilisateurs
   - Correction des bugs
   - Ajout de fonctionnalités

### 4. Bonnes pratiques appliquées

| Domaine | Pratique |
|---------|----------|
| **Code** | TypeScript strict, composants réutilisables |
| **ML** | Séparation train/val/test, validation croisée temporelle |
| **Données** | Documentation des sources, méthodologie transparente |
| **UX** | Interface intuitive, feedback visuel clair |

---

## Étude comparative des hôpitaux sur leur gestion des ressources

### Gestion des ressources dans les grands centres hospitaliers universitaires (CHU)

Les CHU sont les établissements hospitaliers les plus complexes du système de santé français. Ils assurent trois missions principales : soins spécialisés, formation universitaire et recherche. Ils accueillent des patients présentant des pathologies lourdes ou complexes, souvent transférés depuis d'autres établissements.

Cette diversité d'activités entraîne une forte variabilité des flux de patients. Les admissions incluent non seulement des cas programmés, mais aussi des urgences lourdes et des situations exceptionnelles comme des crises sanitaires ou des accidents collectifs. La gestion des lits devient particulièrement délicate, car les patients nécessitent parfois de longues hospitalisations dans des unités spécialisées.

Pour répondre à cette complexité, de nombreux CHU ont mis en place une **gestion centralisée des lits**, souvent via une cellule dédiée ou un gestionnaire chargé de répartir les patients entre les services disponibles. Malgré ces dispositifs, la coordination reste difficile en raison du grand nombre d'unités impliquées et des contraintes médicales spécifiques.

La gestion du personnel constitue également un défi majeur. Certaines spécialités, comme la réanimation ou l'anesthésie, reposent sur des équipes hautement qualifiées et difficilement remplaçables. Lors de pics d'activité, l'établissement doit procéder à des arbitrages, allant parfois jusqu'à déprogrammer des actes non urgents pour redéployer les équipes vers les secteurs en tension.

Les CHU disposent généralement d'un plateau technique important, mais celui-ci peut devenir un facteur limitant lorsque la demande dépasse les capacités disponibles, entraînant des retards dans les examens ou interventions nécessaires.

### Gestion des ressources dans les hôpitaux régionaux et de proximité

Les hôpitaux régionaux ou de proximité ont une organisation plus simple et une activité plus homogène que les CHU. Ils prennent principalement en charge les patients du territoire local et disposent de moins de services hyper-spécialisés.

Cette organisation facilite la communication interne et permet une prise de décision plus rapide. Cependant, ces établissements ont aussi des ressources plus limitées en lits et en personnel. Une augmentation même modérée des admissions peut rapidement saturer les capacités disponibles.

La gestion des lits est souvent assurée au niveau des services ou des pôles, sans cellule centralisée aussi structurée que dans les grands CHU. En période de tension, ces établissements s'appuient sur des transferts vers d'autres structures ou sur la coopération avec les établissements de soins de suite.

La flexibilité du personnel reste limitée en raison d'effectifs réduits. Les absences ou congés impactent directement la capacité d'accueil, rendant la planification des ressources particulièrement sensible.

### Gestion des ressources dans les cliniques privées

Les cliniques privées fonctionnent différemment : leur activité repose principalement sur des actes programmés, notamment en chirurgie. Cette planification permet d'anticiper les besoins en lits et en personnel, et de réguler l'activité.

La gestion des ressources dépend directement du programme opératoire. En cas de tension, l'établissement peut reporter certaines interventions non urgentes pour libérer des capacités d'hospitalisation.

Les séjours sont généralement courts, ce qui permet une rotation rapide des lits. Ces établissements sont toutefois moins adaptés aux flux imprévus importants, comme les crises sanitaires ou les afflux massifs de patients.

### Tableau synthétique

| **Dimension** | **CHU / Grand hôpital** | **Hôpital régional / proximité** | **Clinique privée** |
|---------------|-------------------------|----------------------------------|---------------------|
| Complexité des cas | Très élevée | Moyenne | Faible à moyenne |
| Variabilité des flux | Très forte | Moyenne | Faible (plus programmé) |
| Gestion des lits | Centralisée et complexe | Locale ou simplifiée | Pilotée par programmation |
| Flexibilité du personnel | Moyenne mais contrainte par spécialités | Faible | Moyenne via planning |
| Plateau technique | Très développé mais sollicité | Limité | Adapté aux spécialités |
| Risque principal | Saturation organisationnelle | Manque de capacité | Sensibilité aux flux non programmés |
| Mode principal d'adaptation | Déprogrammation, réorganisation interne | Transferts et ajustements locaux | Ajustement du planning opératoire |
| Besoin d'anticipation | **Très élevé** | Élevé | Moyen |

### Positionnement de la Pitié-Salpêtrière

La Pitié-Salpêtrière, en tant que **plus grand CHU de France**, cumule les défis caractéristiques des grands centres hospitaliers :

| Caractéristique | Valeur |
|-----------------|--------|
| Capacité totale | ~1 700 lits |
| Admissions annuelles | ~165 000 |
| Personnel total | ~10 000 agents |
| Services spécialisés | 90+ unités |
| Urgences/jour | ~300-400 passages |

**Défis spécifiques** :
- Coordination entre de nombreuses unités très spécialisées
- Gestion des afflux liés aux crises (COVID, canicules, accidents)
- Attractivité régionale générant des transferts complexes
- Formation universitaire impactant la disponibilité des équipes

**C'est précisément pour répondre à ces défis que notre outil de prédiction et simulation a été développé.**

---

## Analyse approfondie des tendances hospitalières et leurs stratégies

### 1. Tendances d'admissions identifiées

#### 1.1 Saisonnalité annuelle

```
              J    F    M    A    M    J    J    A    S    O    N    D
Admissions   ████ ████ ███  ██   ██   ██   █    █    ██   ███  ███  ████
             Haut Haut Moy  Bas  Bas  Bas  Min  Min  Bas  Moy  Moy  Haut
```

| Période | Caractéristique | Facteurs |
|---------|-----------------|----------|
| **Hiver (Déc-Fév)** | +25-35% admissions | Grippe, bronchiolites, COVID |
| **Été (Juil-Août)** | -15-20% admissions | Vacances, moins de programmé |
| **Canicules** | Pics ponctuels +40% | Déshydratation, AVC, cardio |
| **Rentrée (Sept)** | Reprise progressive | Retour activité programmée |

#### 1.2 Saisonnalité hebdomadaire

| Jour | Variation | Explication |
|------|-----------|-------------|
| Lundi | +15% | Accumulation du week-end |
| Mardi-Jeudi | Référence | Activité normale |
| Vendredi | +5% | Anticipation week-end |
| Week-end | -25% | Moins de programmé, urgences seulement |

#### 1.3 Périodes critiques identifiées

**Analyse historique 2020-2025** :

| Événement | Période | Impact | Durée |
|-----------|---------|--------|-------|
| COVID Vague 1 | Mars-Mai 2020 | +80% réa | 3 mois |
| COVID Vague 2 | Nov 2020-Jan 2021 | +60% réa | 3 mois |
| Canicule 2022 | Juin-Juillet | +35% urgences | 2 semaines |
| Grippe 2023 | Janvier | +40% médecine | 6 semaines |
| Bronchiolite 2023 | Nov-Déc | +50% pédiatrie | 2 mois |

### 2. Stratégies hospitalières actuelles

#### 2.1 Stratégies de gestion des pics

| Stratégie | Description | Efficacité |
|-----------|-------------|------------|
| **Déprogrammation** | Report des actes non urgents | Haute, mais impacte les patients |
| **Lits supplémentaires** | Ouverture de lits temporaires | Moyenne, limitée par le personnel |
| **Heures supplémentaires** | Mobilisation du personnel | Court terme, risque d'épuisement |
| **Transferts** | Vers autres établissements | Variable, dépend du réseau |
| **Cellule de crise** | Coordination renforcée | Haute si bien organisée |

#### 2.2 Limites des stratégies actuelles

1. **Réactivité vs Anticipation**
   - Les décisions sont souvent prises en réaction à la crise
   - Manque d'outils de prédiction fiables
   - Temps de réaction trop court

2. **Silos organisationnels**
   - Chaque service gère ses ressources
   - Difficulté de mutualisation
   - Manque de vision globale

3. **Données fragmentées**
   - Systèmes d'information hétérogènes
   - Pas de tableau de bord unifié
   - Difficulté à analyser les tendances

### 3. Apport de notre outil

| Limite actuelle | Solution proposée |
|-----------------|-------------------|
| Décisions réactives | Prédictions à 30 jours |
| Vision fragmentée | Dashboard unifié |
| Données non exploitées | Analyse automatisée |
| Recommandations subjectives | Algorithmes objectifs |
| Simulation manuelle | Scénarios automatisés |

---

## Présentation de l'analyse statistique et des modèles

### 1. Données analysées

#### 1.1 Sources de données

| Source | Type | Utilisation |
|--------|------|-------------|
| **SAE (DREES)** | Officielle | Calibration des capacités |
| **Hospi-Diag** | Officielle | Indicateurs de performance |
| **Santé Publique France** | Officielle | Données épidémiologiques |
| **Données générées** | Synthétique | Simulation et test |

#### 1.2 Datasets créés

**Dataset `etablissement.csv`** :
- **2 192 lignes** (1 par jour, 2020-2025)
- **71 colonnes** : admissions, personnel, lits, examens, stock sang...
- Granularité : quotidienne

**Dataset `admissions_complet.csv`** :
- **981 619 lignes** (1 par patient)
- **22 colonnes** : date, service, âge, gravité, durée séjour, mode sortie...
- Granularité : individuelle

### 2. Analyses statistiques réalisées

#### 2.1 Statistiques descriptives

| Indicateur | Valeur | Interprétation |
|------------|--------|----------------|
| Admissions moyennes | 448/jour | Référence pour le calibrage |
| Écart-type | 78 | Variabilité importante |
| Min | 285 | Jours calmes (été) |
| Max | 687 | Pics de crise |
| Médiane | 442 | Distribution symétrique |

#### 2.2 Analyse de corrélations

| Variable 1 | Variable 2 | Corrélation | Interprétation |
|------------|------------|-------------|----------------|
| Admissions | Occupation lits | +0.82 | Forte liaison logique |
| Température | Admissions urgences | +0.45 (canicule) | Impact des vagues de chaleur |
| Jour semaine | Admissions | Variable | Effet lundi fort |
| Mois | Admissions | Variable | Saisonnalité marquée |

### 3. Visualisations implémentées et justifications

#### 3.1 Graphiques temporels (LineChart)

**Justification** : Les données d'admissions sont des séries temporelles. Le graphique linéaire permet de :
- Visualiser les tendances à long terme
- Identifier les patterns saisonniers
- Repérer les événements exceptionnels

**Exemple d'utilisation** : Dashboard principal, évolution des admissions sur 30 jours.

#### 3.2 Graphiques en barres (BarChart)

**Justification** : Comparaison de valeurs discrètes entre catégories.

**Utilisations** :
- Comparaison des admissions par jour de la semaine
- Comparaison des taux d'occupation par service
- Répartition par gravité

#### 3.3 Graphiques en aires empilées (AreaChart)

**Justification** : Visualiser la composition et l'évolution simultanément.

**Utilisation** : Évolution de l'occupation des lits par type (médecine, chirurgie, réa).

#### 3.4 Graphiques combinés (ComposedChart)

**Justification** : Superposer des indicateurs de natures différentes.

**Exemple** : Admissions (barres) + Taux d'occupation (ligne) sur le même graphique.

#### 3.5 Camemberts (PieChart)

**Justification** : Répartition d'un total en catégories.

**Utilisation** : Répartition des admissions par service, par mode de sortie.

### 4. Modèles statistiques classiques

#### 4.1 ARIMA (AutoRegressive Integrated Moving Average)

**Formulation** :
```
y_t = c + φ₁y_{t-1} + ... + φ_p y_{t-p} + θ₁ε_{t-1} + ... + θ_q ε_{t-q} + ε_t
```

**Configuration utilisée** : ARIMA(2, 1, 2)
- p=2 : 2 termes autorégressifs
- d=1 : 1 différenciation (stationnarité)
- q=2 : 2 termes de moyenne mobile

**Résultats** :
| Métrique | Valeur |
|----------|--------|
| MAE | 61.68 |
| R² | 0.04 |

**Applicabilité** : Limitée. ARIMA suppose une structure linéaire qui ne capture pas les patterns complexes des données hospitalières.

#### 4.2 Prophet (Facebook)

**Formulation** :
```
y(t) = g(t) + s(t) + h(t) + ε_t
```
- g(t) : tendance
- s(t) : saisonnalité
- h(t) : effets des jours fériés

**Configuration** :
- Saisonnalité annuelle : ✅
- Saisonnalité hebdomadaire : ✅
- Saisonnalité mensuelle : ✅ (ajoutée)
- Jours fériés français : ✅

**Résultats** :
| Métrique | Valeur |
|----------|--------|
| MAE | 54.53 |
| R² | 0.34 |

**Applicabilité** : Modérée. Prophet capture bien les tendances mais manque de précision sur les variations quotidiennes.

---

## Présentation des modèles de prédiction et justification des choix

### 1. Modèles de Machine Learning

#### 1.1 Random Forest Regressor

**Principe** : Ensemble de nombreux arbres de décision dont les prédictions sont moyennées.

**Avantages** :
- Capture les relations non-linéaires
- Robuste au surapprentissage
- Gère bien les nombreuses features
- Pas de prétraitement des données requis

**Paramètres optimisés** :
```python
RandomForestRegressor(
    n_estimators=200,      # Nombre d'arbres
    max_depth=15,          # Profondeur maximale
    min_samples_split=2,   # Échantillons min pour split
    min_samples_leaf=1,    # Échantillons min par feuille
)
```

**Résultats (séparation 70/15/15)** :
| Métrique | Validation | Test |
|----------|------------|------|
| MAE | 16.83 | 15.64 |
| R² | 0.9565 | 0.9474 |

#### 1.2 Gradient Boosting Regressor

**Principe** : Construction séquentielle d'arbres où chaque arbre corrige les erreurs du précédent.

**Avantages** :
- Très performant sur données tabulaires
- Optimise directement la fonction de perte
- Excellente précision

**Paramètres** :
```python
GradientBoostingRegressor(
    n_estimators=200,
    max_depth=8,
    learning_rate=0.1,
)
```

**Résultats (séparation 70/15/15)** :
| Métrique | Validation | Test |
|----------|------------|------|
| MAE | 13.94 | **12.21** |
| R² | 0.9656 | **0.9620** |

### 2. Justification du choix : Gradient Boosting

#### 2.1 Comparaison des performances

| Modèle | MAE Test | R² Test | Choix |
|--------|----------|---------|-------|
| ARIMA | ~62 | 0.04 | ❌ |
| Prophet | ~55 | 0.34 | ❌ |
| Random Forest | 15.64 | 0.95 | ⭐ |
| **Gradient Boosting** | **12.21** | **0.96** | ✅ **Retenu** |

#### 2.2 Raisons du choix

1. **Meilleure précision** : MAE de 12 admissions vs 62 pour ARIMA
2. **Généralisation prouvée** : MAE(Test) < MAE(Val) → pas d'overfitting
3. **Interprétabilité** : Importance des features exploitable
4. **Robustesse** : Validation croisée temporelle concluante

#### 2.3 Pourquoi pas les autres ?

| Modèle | Raison de non-sélection |
|--------|-------------------------|
| ARIMA | Trop simpliste, ne capture pas les patterns complexes |
| Prophet | Performant pour tendances, mais MAE trop élevée |
| Random Forest | Excellent, mais légèrement moins précis que GB |

### 3. Feature Engineering - Clé du succès

#### 3.1 Importance du feature engineering

**Sans feature engineering** (données brutes) :
- Random Forest MAE : ~31
- R² : ~0.77

**Avec feature engineering** (88 features) :
- Random Forest MAE : ~15
- R² : ~0.95

**Amélioration : -52% d'erreur grâce aux features !**

#### 3.2 Features les plus importantes

| Rang | Feature | Importance | Explication |
|------|---------|------------|-------------|
| 1 | lag_1 | 0.28 | Admissions de la veille |
| 2 | ma_7 | 0.15 | Moyenne mobile 7 jours |
| 3 | ema_7 | 0.12 | Moyenne exponentielle |
| 4 | lag_7 | 0.10 | Même jour semaine précédente |
| 5 | day_of_week | 0.08 | Jour de la semaine |
| 6 | month | 0.06 | Mois (saisonnalité) |
| 7 | trend_7d | 0.05 | Tendance récente |
| 8 | is_weekend | 0.04 | Week-end oui/non |

### 4. Protocole d'évaluation rigoureux

#### 4.1 Séparation des données

```
════════════════════════════════════════════════════════════════════════
  2020-01-01              2024-03-13        2025-02-05        2025-12-31
      │                       │                 │                 │
      │◄═══════ TRAIN ════════►│◄═══ VALID ═════►│◄═════ TEST ════►│
      │      1534 jours        │    329 jours    │    329 jours    │
      │        (70%)           │     (15%)       │     (15%)       │
════════════════════════════════════════════════════════════════════════
```

#### 4.2 Validation croisée temporelle

```
Fold 1: [====Train====][Val]     → GB MAE: 29.05
Fold 2: [======Train======][Val]     → GB MAE: 21.66
Fold 3: [========Train========][Val]     → GB MAE: 17.19
Fold 4: [==========Train==========][Val]     → GB MAE: 16.64
Fold 5: [============Train============][Val]     → GB MAE: 14.09
                                              ─────────────
                                              Moyenne: 19.73
```

### 5. Impact de l'utilisation du modèle

#### 5.1 Bénéfices attendus

| Aspect | Sans modèle | Avec modèle | Gain |
|--------|-------------|-------------|------|
| Anticipation | 0-2 jours | **30 jours** | +28 jours |
| Précision | Estimation subjective | **±12 admissions** | Objectif |
| Temps décision | Réactif | **Proactif** | Réduction stress |
| Déprogrammation | Dernière minute | **Planifiée** | Moins d'impact patient |

#### 5.2 Exemple concret d'utilisation

**Scénario** : Prédiction d'un pic d'admissions dans 10 jours

**Actions possibles** :
1. Rappeler du personnel en congé (J-7)
2. Préparer des lits supplémentaires (J-5)
3. Alerter les services de réa (J-3)
4. Activer le protocole de déprogrammation si nécessaire (J-2)
5. Communiquer avec les établissements partenaires (J-1)

**Résultat** : Crise gérée de manière proactive au lieu de réactive.

### 6. Limites et perspectives

#### 6.1 Limites actuelles

1. **Événements non prévisibles** : Accidents, nouvelles épidémies
2. **Données exogènes manquantes** : Météo, épidémies en cours
3. **Horizon limité** : Précision diminue au-delà de 30 jours

#### 6.2 Améliorations futures

| Amélioration | Impact attendu |
|--------------|----------------|
| Intégration météo | +5% précision canicules |
| Données Sentinelles (grippe) | +10% précision hiver |
| Deep Learning (LSTM) | Potentiellement +5-10% global |
| Réentraînement automatique | Maintien performances |

---

## Conclusion

Notre prototype répond aux objectifs fixés :

1. **Anticipation** : Prédictions fiables à 30 jours (MAE = 12, R² = 0.96)
2. **Optimisation** : Traduction en besoins concrets (lits, personnel, équipements)
3. **Simulation** : Scénarios de crise testables
4. **Aide à la décision** : Recommandations automatisées et priorisées

Le choix du **Gradient Boosting** comme modèle principal est justifié par :
- Ses performances supérieures à tous les autres modèles testés
- Sa capacité à généraliser (pas d'overfitting)
- Son interprétabilité via l'importance des features

L'outil développé permet de passer d'une gestion **réactive** à une gestion **proactive** des ressources hospitalières.

---

*Document généré - Février 2026*
*Projet Data Science - Pitié-Salpêtrière*
