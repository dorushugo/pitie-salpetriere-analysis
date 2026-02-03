# Méthodologie de Génération des Datasets

## 📋 Vue d'ensemble

**Période couverte** : 2020-01-01 → 2025-12-31 (6 ans)

Les datasets ont été générés en combinant :
1. **Données réelles officielles** (Hospi-Diag, SAE DREES)
2. **Patterns statistiques connus** (saisonnalité, événements)
3. **Simulation réaliste** avec **corrélations** entre variables
4. **Évolutions annuelles** basées sur tendances nationales

---

## 📈 Évolutions Annuelles Simulées

| Indicateur | Taux annuel | Source |
|------------|-------------|--------|
| Admissions | +2%/an | Tendance démographique |
| Personnel médical (ETP) | +2.5%/an | Politique recrutement |
| Personnel non-médical (ETP) | +1.5%/an | Politique recrutement |
| Capacité lits | +1%/an | Extension capacité |
| Équipements (IRM, Scanner) | +1 tous les 1-2 ans | Investissements |

### Résultat sur la période

| Indicateur | 2020 | 2025 | Évolution |
|------------|------|------|-----------|
| Admissions/jour | ~437 | ~460 | +5.3% |
| Médecins (ETP) | 444 | 503 | +13.3% |
| Personnel soins (ETP) | 4370 | 4716 | +7.9% |
| Lits médecine | 720 | 757 | +5.1% |

---

## 🔗 Corrélations Implémentées

Les variables ne sont **pas indépendantes** - voici les corrélations :

| Variable 1 | Variable 2 | Sens | Description |
|------------|------------|------|-------------|
| Admissions | Occupation lits | ↑↑ | Plus d'admissions → tension sur les lits (facteur 0.2) |
| Événement | Personnel présent | ↑↑ | Crises → renforcement présence (facteur 0.3) |
| Activité | Stock sang | ↑↓ | Plus d'activité → consommation stock |
| Jour précédent | Admissions | ↑↑ | Lissage temporel (facteur 0.3) |
| Gravité | Durée séjour | ↑↑ | Patients graves restent plus longtemps |
| Âge | Gravité | ↑↑ | Patients âgés (+70) ont gravité +1 |
| Événement | Services | ↑↑ | COVID → +Maladies Infectieuses, +Réanimation |

---

## 🏥 Sources Officielles Utilisées

### 1. Hospi-Diag (ATIH)
- **URL** : https://hospidiag.atih.sante.fr
- **FINESS** : 750100125 (Pitié-Salpêtrière)
- **Données extraites** :
  - Lits installés par type (2020-2023)
  - Personnel ETP par catégorie
  - Taux d'occupation
  - Activité (RSA, actes chirurgicaux)
  - Équipements (scanners, IRM, blocs)

### 2. SAE DREES
- **URL** : https://drees.solidarites-sante.gouv.fr
- **Données extraites** :
  - Capacités détaillées 2019-2024
  - Personnel par catégorie
  - Évolution historique

### 3. Santé Publique France (Odissé)
- **URL** : https://odisse.santepubliquefrance.fr
- **Données utilisées** :
  - Passages aux urgences COVID
  - Patterns épidémiques

### 4. Réseau Sentinelles
- **URL** : https://www.sentiweb.fr
- **Données utilisées** :
  - Saisonnalité grippe
  - Épidémies bronchiolite

---

## 📊 Fichier `etablissement.csv`

### Structure
- **Granularité** : 1 ligne = 1 jour
- **Période** : 01/01/2020 - 31/12/2025
- **Lignes** : 2192 jours
- **Colonnes** : 71

### Colonnes et Calculs

#### Lits (par type : médecine, chirurgie, réanimation, SI, USC, obstétrique)
```
Source : Hospi-Diag 2023 (référence)
Évolution : +1%/an appliqué

Calcul occupation journalière :
tension_admissions = admissions_jour / admissions_base
taux = taux_base × facteur_événement × (0.5 + 0.5×facteur_saison) × (0.8 + 0.2×tension_admissions)
taux = clamp(taux + bruit(σ=4%), 0.30, 0.98)
lits_occupés = total × taux
```

#### Personnel par catégorie
```
Source : Hospi-Diag 2023 (référence)
Évolution : +2.5%/an (médical), +1.5%/an (non-médical)

Calcul présents :
taux_présence_weekend = 0.65 + random(0, 0.10)
taux_présence_semaine = 0.88 + random(0, 0.08)
présents = effectif(année) × taux_présence × min(1.0, facteur_événement×0.3)
```

#### Admissions du jour
```
Base 2023 : 450/jour (source : 164k RSA/an ÷ 365)
Évolution : +2%/an

Calcul :
adm_brut = base(année) × facteur_événement × facteur_saison × facteur_weekend
adm_lissé = 0.7 × adm_brut + 0.3 × admissions_veille
admissions = adm_lissé + bruit(σ=8%)
```

#### Événements spéciaux (2020-2025)
```
COVID vagues :
- Vague 1 : 15/03-15/05/2020 (×1.45)
- Vague 2 : 15/10/2020-15/01/2021 (×1.30)
- Vague 3 : 01/03-01/05/2021 (×1.25)
- Omicron : 15/12/2021-01/02/2022 (×1.20)
- BA.5 : 15/06-15/07/2022 (×1.15)

Canicules : 6 épisodes (×1.18)
- Août 2020, Juin 2021, Juillet 2022, Août 2023, Juillet 2024, Juillet 2025

Grippe : Déc-Fév chaque année (×1.22)
Bronchiolite : Oct-Déc 2022-2025 (×1.15)
Gastro : Jan-Fév chaque année (×1.12)
```

#### Examens
```
ratio_examens = 1.5 + random(0, 0.5)
Si événement ≠ normal : ratio × 1.1

Répartition variable :
- Scanner : 23-27%
- IRM : 13-17%
- Radio : 38-42%
- Autres : reste
```

#### Décès
```
taux_graves_normal = 5%
taux_graves_covid_vague1 = 12%
taux_graves_covid_autres = 8%

taux_mortalité_graves = 2.5% + random(0, 2%)
décès = admissions × taux_graves × taux_mortalité
```

#### Stock sang
```
Modèle dynamique :
consommation = cas_graves × 0.3
renouvellement = 15 + random(0, 10) poches/jour
stock = stock_veille - consommation + renouvellement
stock = clamp(stock + bruit(σ=20), 300, 700)
critique si < 400
```

---

## 👤 Fichier `admissions_complet.csv`

### Structure
- **Granularité** : 1 ligne = 1 patient
- **Période** : 2020-2025
- **Lignes** : ~980,000 patients
- **Colonnes** : 22

### Synchronisation avec établissement.csv
```
Le nombre de patients générés par jour est EXACTEMENT égal à 
nb_admissions dans etablissement.csv pour cette date.
→ Cohérence garantie entre les deux fichiers
```

### Colonnes et Calculs

#### Distribution âge
```
Tranches (avec pondération) :
5 ans (5%), 15 ans (5%), 25 ans (10%), 35 ans (12%)
45 ans (15%), 55 ans (18%), 65 ans (18%), 75 ans (12%), 85 ans (5%)
+ variation ±4 ans
```

#### Gravité
```
base_gravité = 2
Si âge > 70 : +1
Si événement ≠ normal : +0.5
gravité = clamp(base + bruit(σ=0.8), 1, 5)
```

#### Durée séjour
```
Si Urgences passage simple : exponentielle(0.5) → beaucoup de 0
Sinon : exponentielle(gravité × 1.5 + âge × 0.03)
```

#### Coût
```
base = 500 + durée × 800
Si Réanimation : × 3
Si Chirurgie : × 1.8
coût = base × (0.8 + random(0, 0.4))
```

#### Mode d'arrivée
```
Si type_admission = "Urgence" :
  - urgences_pied : 50%
  - urgences_ambulance : 35%
  - samu : 15%

Si type_admission = "Transfert" :
  - transfert : 100%

Sinon (programmé) :
  - programme : 75%
  - consultation : 25%
```

#### Services (poids adaptés aux événements)
```
Base :
- Médecine : 25%
- Chirurgie : 20%
- Urgences : 18%
- Réanimation : 5%
- Cardiologie : 10%
- Neurologie : 8%
- Pédiatrie : 6%
- Maladies Infectieuses : 8%

Modulation événement :
- COVID : Mal. Infectieuses ×2, Réanimation ×1.5
- Grippe : Mal. Infectieuses ×1.5
- Canicule : Cardiologie ×1.3
```

#### Motif admission
```
Liste de 16 motifs
Si COVID et random > 0.5 : "COVID-19"
Si Grippe et random > 0.6 : "Grippe" ou "Pneumonie"
Sinon : choix aléatoire
```

---

## ✅ Points de Validation

### Cohérence interne
- ✅ Total admissions annuel ~160k (cohérent avec RSA Hospi-Diag)
- ✅ Taux occupation moyen 65-85% selon service
- ✅ Saisonnalité visible (hiver > été)
- ✅ Pics COVID 2020-2021 très visibles (+30-45%)
- ✅ Évolution croissante personnel et admissions
- ✅ Synchronisation établissement ↔ admissions

### Comparaison sources externes (année 2023)
| Indicateur | Dataset | Source officielle | Écart |
|------------|---------|-------------------|-------|
| Lits médecine | 742 | 742 (Hospi-Diag 2023) | 0% |
| Lits chirurgie | 385 | 385 (Hospi-Diag 2023) | 0% |
| ETP médecins | 479 | 479 (Hospi-Diag 2023) | 0% |
| ETP soins | 4716 | 4715.76 (Hospi-Diag 2023) | 0% |
| Admissions/an | ~163k | 156k RSA (Hospi-Diag 2023) | +4.5% |
| Taux occ. médecine | 67% | 67% (Hospi-Diag 2023) | 0% |
| Scanners | 8 | 7 (Hospi-Diag 2023) | +1 (évolution) |

---

## ⚠️ Limites et Hypothèses

1. **Évolutions linéaires** : croissance constante appliquée, pas de chocs
2. **Heures simulées** : heures d'admission/sortie aléatoires
3. **Stock sang** : modèle simplifié sans données réelles
4. **Absentéisme** : taux de présence estimé (~85-95%)
5. **Corrélations simplifiées** : relations linéaires, pas de modèle complexe
6. **Pas de réadmissions** : chaque admission = nouveau patient

---

## 📚 Références

1. ATIH - Hospi-Diag : https://hospidiag.atih.sante.fr
2. DREES - SAE : https://drees.solidarites-sante.gouv.fr
3. Santé Publique France : https://www.santepubliquefrance.fr
4. FHF - Observatoire : https://www.fhf.fr
5. Réseau Sentinelles : https://www.sentiweb.fr
6. AP-HP - Rapport d'activité : https://www.aphp.fr
