# Datasets Externes - Sources Réelles

Ce dossier contient des datasets réels téléchargés depuis des sources officielles françaises pour enrichir et valider les modèles de prédiction.

## Résumé des Données

| Fichier | Source | Lignes | Description |
|---------|--------|--------|-------------|
| `covid-19-passages-aux-urgences-et-actes-sos-medecins-departement.csv` | Santé Publique France | 164,841 | Passages COVID urgences par département |
| `covid-19-passages-aux-urgences-et-actes-sos-medecins-region.csv` | Santé Publique France | 28,531 | Passages COVID urgences par région |
| `covid-19-passages-aux-urgences-et-actes-sos-medecins-france.csv` | Santé Publique France | 1,586 | Passages COVID urgences France entière |
| `incidence_grippe_sentinelles.csv` | SURSAUD / SPF | 520,353 | Passages urgences COVID quotidiens par département |
| `sursaud_covid_quotidien.csv` | SURSAUD / SPF | 338,246 | Données quotidiennes COVID SURSAUD |
| `hospitalisations_covid.csv` | SPF / SI-VIC | 113,017 | Hospitalisations COVID par département |
| `grippe_incidence_region.csv` | Réseau Sentinelles | 49,216 | Incidence grippe par région (1984-2026) |
| `grippe_incidence_france.csv` | Réseau Sentinelles | 2,154 | Incidence grippe France (1984-2026) |
| `gastro_incidence_france.csv` | Réseau Sentinelles | 1,836 | Incidence gastro-entérite France |

**Total : ~1.22 million de lignes de données réelles**

## Sources

### Santé Publique France (SPF)
- **Portail Odissé** : https://odisse.santepubliquefrance.fr/
- **Données SURSAUD/OSCOUR®** : Réseau de surveillance des urgences (96% des passages nationaux)
- **SOS Médecins** : Données de 62 associations SOS Médecins

### Réseau Sentinelles (INSERM / Sorbonne)
- **URL** : https://www.sentiweb.fr/
- Surveillance des syndromes grippaux depuis 1984
- Basé sur les déclarations des médecins généralistes

### Data.gouv.fr
- **URL** : https://www.data.gouv.fr/
- Portail open data du gouvernement français

## Structure des Données

### Passages aux Urgences COVID (SPF)
```
Colonnes : 1er jour de la semaine, Semaine, Classe d'âge, 
           Taux passages urgences, Taux hospitalisations, 
           Taux actes SOS Médecins
Classes d'âge : 00-04 ans, 05-14 ans, 15-64 ans, 65+ ans, Tous âges
```

### Incidence Grippe (Sentinelles)
```
Colonnes : week, indicator, inc, inc_low, inc_up, 
           inc100, inc100_low, inc100_up, geo_insee, geo_name
Période : 1984-2026 (hebdomadaire)
```

### Hospitalisations COVID (SI-VIC)
```
Colonnes : dep, jour, incid_hosp, incid_rea, incid_dc, incid_rad
Période : Mars 2020 - présent (quotidien)
```

## Utilisation

Ces données peuvent être utilisées pour :
1. **Calibrer les modèles** avec des patterns saisonniers réels
2. **Valider les prédictions** contre des données historiques
3. **Enrichir les simulations** avec des scénarios basés sur des épidémies réelles
4. **Former les modèles ML** avec des features temporelles réelles

## Licence

Ces données sont en **Open Data** et peuvent être réutilisées librement selon les conditions d'usage de chaque source.
