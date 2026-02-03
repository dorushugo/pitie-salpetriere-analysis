"""
Analyse des données réelles des urgences françaises (DREES 2017-2023)
pour extraire les patterns saisonniers et ajuster la génération de données.
"""

import pandas as pd
import numpy as np
from datetime import datetime

# Charger les données DREES
print("Chargement des données DREES (urgences France 2017-2023)...")
df = pd.read_csv('../data/reference_urgences_france.csv', sep=';')
df['date'] = pd.to_datetime(df['date'])

# Filtrer Paris (75) - le plus pertinent pour Pitié-Salpêtrière
paris = df[df['dep'] == '75'].copy()
paris = paris.sort_values('date')

print(f"\n=== DONNÉES PARIS (75) ===")
print(f"Période: {paris['date'].min()} à {paris['date'].max()}")
print(f"Nombre de jours: {len(paris)}")
print(f"Passages journaliers - Moyenne: {paris['nb_passages'].mean():.1f}")
print(f"Passages journaliers - Min: {paris['nb_passages'].min():.1f}")
print(f"Passages journaliers - Max: {paris['nb_passages'].max():.1f}")
print(f"Passages journaliers - Écart-type: {paris['nb_passages'].std():.1f}")

# Calculer la part de la Pitié-Salpêtrière (environ 122 000 / an = 334/jour)
# La Pitié représente environ 16% des urgences parisiennes
RATIO_PITIE = 334 / paris['nb_passages'].mean()
print(f"\n=== ESTIMATION PITIÉ-SALPÊTRIÈRE ===")
print(f"Ratio Pitié/Paris: {RATIO_PITIE:.2%}")
print(f"Passages Pitié estimés: {paris['nb_passages'].mean() * RATIO_PITIE:.1f}/jour")

# Analyse saisonnière - par mois
paris['mois'] = paris['date'].dt.month
paris['jour_semaine'] = paris['date'].dt.dayofweek
paris['annee'] = paris['date'].dt.year

print("\n=== SAISONNALITÉ MENSUELLE (variation vs moyenne) ===")
monthly_avg = paris.groupby('mois')['nb_passages'].mean()
annual_avg = paris['nb_passages'].mean()
monthly_ratio = monthly_avg / annual_avg

for mois, ratio in monthly_ratio.items():
    mois_noms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 
                 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    variation = (ratio - 1) * 100
    print(f"  {mois_noms[mois-1]}: {ratio:.3f} ({variation:+.1f}%)")

print("\n=== VARIATION PAR JOUR DE SEMAINE ===")
weekly_avg = paris.groupby('jour_semaine')['nb_passages'].mean()
weekly_ratio = weekly_avg / annual_avg

jours_noms = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
for jour, ratio in weekly_ratio.items():
    variation = (ratio - 1) * 100
    print(f"  {jours_noms[jour]}: {ratio:.3f} ({variation:+.1f}%)")

# Données nationales pour contexte
print("\n=== DONNÉES NATIONALES ===")
national_daily = df.groupby('date')['nb_passages'].sum()
print(f"Passages France/jour - Moyenne: {national_daily.mean():.0f}")
print(f"Passages France/jour - Min: {national_daily.min():.0f}")
print(f"Passages France/jour - Max: {national_daily.max():.0f}")

# Exporter les coefficients pour le générateur
print("\n=== COEFFICIENTS POUR GÉNÉRATION ===")
print("\n# Coefficients mensuels (à copier dans generate_dataset.py)")
print("MONTHLY_COEFFICIENTS = {")
for mois, ratio in monthly_ratio.items():
    print(f"    {mois}: {ratio:.4f},")
print("}")

print("\n# Coefficients jour de semaine")
print("WEEKDAY_COEFFICIENTS = {")
for jour, ratio in weekly_ratio.items():
    print(f"    {jour}: {ratio:.4f},  # {jours_noms[jour]}")
print("}")

# Calculer les stats pour Pitié-Salpêtrière
print("\n=== PARAMÈTRES ESTIMÉS PITIÉ-SALPÊTRIÈRE ===")
pitie_daily = paris['nb_passages'] * RATIO_PITIE
print(f"Admissions/jour - Moyenne: {pitie_daily.mean():.0f}")
print(f"Admissions/jour - Min: {pitie_daily.min():.0f}")
print(f"Admissions/jour - Max: {pitie_daily.max():.0f}")
print(f"Admissions/an estimées: {pitie_daily.mean() * 365:.0f}")
