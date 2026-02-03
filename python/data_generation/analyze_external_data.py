#!/usr/bin/env python3
"""
Analyse des datasets externes réels pour extraire des patterns
et calibrer le générateur de données synthétiques.

Sources analysées:
- COVID-19 passages urgences (Santé Publique France)
- Grippe incidence (Réseau Sentinelles)
- Hospitalisations COVID (SI-VIC)
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "external"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "data"


def analyze_covid_urgences():
    """Analyse les passages aux urgences COVID pour extraire les patterns épidémiques."""
    print("\n=== Analyse COVID-19 Passages Urgences (France) ===")
    
    try:
        df = pd.read_csv(
            DATA_DIR / "covid-19-passages-aux-urgences-et-actes-sos-medecins-france.csv",
            sep=","
        )
        
        # Filtrer "Tous âges" pour avoir les totaux
        df_total = df[df['Classe d\'âge'] == 'Tous âges'].copy()
        df_total['date'] = pd.to_datetime(df_total['1er jour de la semaine'])
        df_total = df_total.sort_values('date')
        
        print(f"Période: {df_total['date'].min()} à {df_total['date'].max()}")
        print(f"Nombre de semaines: {len(df_total)}")
        
        # Trouver les pics
        col_urgences = 'Taux de passages aux urgences pour COVID-19'
        max_urgences = df_total[col_urgences].max()
        max_date = df_total.loc[df_total[col_urgences].idxmax(), 'date']
        
        print(f"\nPic épidémique:")
        print(f"  Date: {max_date}")
        print(f"  Taux de passages: {max_urgences:.1f}")
        
        # Calculer le facteur multiplicateur pendant les vagues
        baseline = df_total[col_urgences].quantile(0.1)  # Baseline = 10e percentile
        peak_factor = max_urgences / baseline if baseline > 0 else 1
        
        print(f"\nFacteur multiplicateur pic vs baseline: {peak_factor:.2f}x")
        
        # Analyser les différentes vagues
        print("\n--- Vagues COVID identifiées ---")
        # Vague 1: Mars-Avril 2020
        v1 = df_total[(df_total['date'] >= '2020-03-01') & (df_total['date'] < '2020-05-01')]
        if not v1.empty:
            print(f"Vague 1 (Mars-Avril 2020): pic = {v1[col_urgences].max():.1f}")
        
        # Vague 2: Automne 2020
        v2 = df_total[(df_total['date'] >= '2020-10-01') & (df_total['date'] < '2020-12-31')]
        if not v2.empty:
            print(f"Vague 2 (Automne 2020): pic = {v2[col_urgences].max():.1f}")
        
        # Vague 3: Printemps 2021
        v3 = df_total[(df_total['date'] >= '2021-03-01') & (df_total['date'] < '2021-05-31')]
        if not v3.empty:
            print(f"Vague 3 (Printemps 2021): pic = {v3[col_urgences].max():.1f}")
        
        return {
            'peak_factor': round(peak_factor, 2),
            'baseline_rate': round(baseline, 2),
            'max_rate': round(max_urgences, 2)
        }
        
    except Exception as e:
        print(f"Erreur: {e}")
        return None


def analyze_covid_departement_75():
    """Analyse les données COVID spécifiques à Paris (75)."""
    print("\n=== Analyse COVID-19 Urgences - Paris (75) ===")
    
    try:
        df = pd.read_csv(
            DATA_DIR / "covid-19-passages-aux-urgences-et-actes-sos-medecins-departement.csv",
            sep=","
        )
        
        # Colonnes disponibles
        print(f"Colonnes: {df.columns.tolist()}")
        
        # Filtrer Paris et tous âges
        # Adapter selon les colonnes réelles
        if 'Département Code' in df.columns:
            df_paris = df[df['Département Code'] == '75'].copy()
        elif 'Département' in df.columns:
            df_paris = df[df['Département'].str.contains('Paris', na=False)].copy()
        else:
            print("Colonnes département non trouvées")
            return None
        
        if 'Classe d\'âge' in df.columns:
            df_paris = df_paris[df_paris['Classe d\'âge'] == 'Tous âges']
        
        print(f"Données Paris: {len(df_paris)} lignes")
        
        if len(df_paris) > 0:
            df_paris['date'] = pd.to_datetime(df_paris['1er jour de la semaine'])
            col_urgences = 'Taux de passages aux urgences pour COVID-19'
            
            if col_urgences in df_paris.columns:
                max_val = df_paris[col_urgences].max()
                mean_val = df_paris[col_urgences].mean()
                print(f"Taux max urgences COVID Paris: {max_val:.1f}")
                print(f"Taux moyen: {mean_val:.1f}")
                
                return {
                    'paris_max_rate': round(max_val, 2),
                    'paris_mean_rate': round(mean_val, 2)
                }
                
    except Exception as e:
        print(f"Erreur: {e}")
        return None


def analyze_grippe_patterns():
    """Analyse les patterns saisonniers de la grippe (Sentinelles)."""
    print("\n=== Analyse Grippe - Réseau Sentinelles (1984-2026) ===")
    
    try:
        df = pd.read_csv(
            DATA_DIR / "grippe_incidence_france.csv",
            comment='#'  # Skip header comment
        )
        
        print(f"Colonnes: {df.columns.tolist()}")
        print(f"Lignes: {len(df)}")
        
        # Convertir les colonnes numériques
        numeric_cols = ['inc', 'inc_low', 'inc_up', 'inc100', 'inc100_low', 'inc100_up']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Extraire année et semaine
        df['year'] = df['week'].astype(str).str[:4].astype(int)
        df['week_num'] = df['week'].astype(str).str[4:].astype(int)
        
        # Incidence pour 100 000 habitants
        col_inc = 'inc100'
        
        print(f"\nStatistiques incidence grippe (pour 100k hab):")
        print(f"  Min: {df[col_inc].min():.1f}")
        print(f"  Max: {df[col_inc].max():.1f}")
        print(f"  Moyenne: {df[col_inc].mean():.1f}")
        print(f"  Médiane: {df[col_inc].median():.1f}")
        
        # Pattern saisonnier par semaine de l'année
        weekly_pattern = df.groupby('week_num')[col_inc].agg(['mean', 'std', 'max'])
        
        # Semaines pics (généralement S01-S10)
        peak_weeks = weekly_pattern['mean'].nlargest(10)
        print(f"\nSemaines pics de grippe (top 10):")
        for week, val in peak_weeks.items():
            print(f"  Semaine {week:02d}: {val:.1f} cas/100k")
        
        # Calculer les coefficients saisonniers
        annual_mean = df[col_inc].mean()
        coefficients = {}
        for week in range(1, 53):
            week_data = df[df['week_num'] == week][col_inc]
            if len(week_data) > 0:
                coefficients[week] = round(week_data.mean() / annual_mean, 4)
        
        print(f"\nCoefficients saisonniers grippe par semaine:")
        for week in [1, 5, 10, 20, 30, 40, 50]:
            if week in coefficients:
                print(f"  Semaine {week:02d}: {coefficients[week]:.2f}x")
        
        return {
            'weekly_coefficients': coefficients,
            'annual_mean_inc100': round(annual_mean, 2),
            'max_inc100': round(df[col_inc].max(), 2),
            'peak_weeks': list(peak_weeks.index)
        }
        
    except Exception as e:
        print(f"Erreur: {e}")
        import traceback
        traceback.print_exc()
        return None


def analyze_hospitalisations():
    """Analyse les données d'hospitalisations COVID."""
    print("\n=== Analyse Hospitalisations COVID (SI-VIC) ===")
    
    try:
        df = pd.read_csv(
            DATA_DIR / "hospitalisations_covid.csv",
            sep=";"
        )
        
        df['jour'] = pd.to_datetime(df['jour'])
        
        # Paris (75)
        df_paris = df[df['dep'] == '75'].copy()
        
        print(f"Période: {df['jour'].min()} à {df['jour'].max()}")
        print(f"Données Paris: {len(df_paris)} jours")
        
        # Stats hospitalisations Paris
        print(f"\nHospitalisations quotidiennes Paris (incid_hosp):")
        print(f"  Moyenne: {df_paris['incid_hosp'].mean():.1f}")
        print(f"  Max: {df_paris['incid_hosp'].max()}")
        print(f"  Total sur période: {df_paris['incid_hosp'].sum()}")
        
        # Pic d'hospitalisations
        max_date = df_paris.loc[df_paris['incid_hosp'].idxmax(), 'jour']
        max_hosp = df_paris['incid_hosp'].max()
        print(f"\nPic Paris: {max_hosp} hospitalisations le {max_date.date()}")
        
        # Ratio hospitalisations/réa
        df_paris_valid = df_paris[(df_paris['incid_hosp'] > 0) & (df_paris['incid_rea'] > 0)]
        if len(df_paris_valid) > 0:
            rea_ratio = df_paris_valid['incid_rea'].sum() / df_paris_valid['incid_hosp'].sum()
            print(f"Ratio réanimation/hospitalisation: {rea_ratio:.2%}")
        
        # Létalité hospitalière
        mortality_ratio = df_paris['incid_dc'].sum() / df_paris['incid_hosp'].sum()
        print(f"Mortalité hospitalière: {mortality_ratio:.2%}")
        
        return {
            'paris_mean_daily_hosp': round(df_paris['incid_hosp'].mean(), 2),
            'paris_max_daily_hosp': int(df_paris['incid_hosp'].max()),
            'rea_ratio': round(rea_ratio if 'rea_ratio' in dir() else 0.15, 4),
            'mortality_ratio': round(mortality_ratio, 4)
        }
        
    except Exception as e:
        print(f"Erreur: {e}")
        import traceback
        traceback.print_exc()
        return None


def analyze_sursaud_data():
    """Analyse les données SURSAUD quotidiennes."""
    print("\n=== Analyse SURSAUD (Données Quotidiennes) ===")
    
    try:
        df = pd.read_csv(
            DATA_DIR / "sursaud_covid_quotidien.csv",
            sep=";"
        )
        
        df['jour'] = pd.to_datetime(df['jour'])
        
        # Agrégation par jour (tous sexes confondus)
        df_daily = df.groupby(['dep', 'jour']).agg({
            'hosp': 'sum',
            'rea': 'sum',
            'rad': 'sum',
            'dc': 'sum'
        }).reset_index()
        
        # Paris (75)
        df_paris = df_daily[df_daily['dep'] == '75'].copy()
        
        print(f"Période: {df['jour'].min()} à {df['jour'].max()}")
        print(f"Données Paris: {len(df_paris)} jours")
        
        # Statistiques
        print(f"\nStock hospitalisés Paris (hosp):")
        print(f"  Moyenne: {df_paris['hosp'].mean():.1f}")
        print(f"  Max: {df_paris['hosp'].max()}")
        
        # Trouver le pic
        max_idx = df_paris['hosp'].idxmax()
        max_date = df_paris.loc[max_idx, 'jour']
        max_hosp = df_paris['hosp'].max()
        print(f"\nPic stock hospitalisés Paris: {max_hosp} le {max_date.date()}")
        
        # Pattern jour de semaine
        df_paris['weekday'] = df_paris['jour'].dt.weekday
        weekday_pattern = df_paris.groupby('weekday')['hosp'].mean()
        mean_hosp = weekday_pattern.mean()
        
        weekday_coeffs = {}
        days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        print("\nPattern jour de semaine (stock hospitalisés):")
        for i, day in enumerate(days):
            coeff = weekday_pattern[i] / mean_hosp
            weekday_coeffs[i] = round(coeff, 4)
            print(f"  {day}: {coeff:.2%}")
        
        return {
            'paris_mean_stock': round(df_paris['hosp'].mean(), 2),
            'paris_max_stock': int(df_paris['hosp'].max()),
            'weekday_coefficients': weekday_coeffs
        }
        
    except Exception as e:
        print(f"Erreur: {e}")
        import traceback
        traceback.print_exc()
        return None


def generate_calibration_file():
    """Génère un fichier de calibration JSON avec tous les patterns extraits."""
    print("\n" + "="*60)
    print("GÉNÉRATION DU FICHIER DE CALIBRATION")
    print("="*60)
    
    calibration = {
        'source': 'Données réelles françaises (SPF, Sentinelles, SI-VIC)',
        'generated_at': pd.Timestamp.now().isoformat(),
        'patterns': {}
    }
    
    # Analyser chaque source
    covid_urgences = analyze_covid_urgences()
    if covid_urgences:
        calibration['patterns']['covid_urgences'] = covid_urgences
    
    covid_paris = analyze_covid_departement_75()
    if covid_paris:
        calibration['patterns']['covid_paris'] = covid_paris
    
    grippe = analyze_grippe_patterns()
    if grippe:
        calibration['patterns']['grippe'] = grippe
    
    hospit = analyze_hospitalisations()
    if hospit:
        calibration['patterns']['hospitalisations'] = hospit
    
    sursaud = analyze_sursaud_data()
    if sursaud:
        calibration['patterns']['sursaud'] = sursaud
    
    # Sauvegarder
    output_file = OUTPUT_DIR / "calibration_real_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(calibration, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Fichier de calibration sauvegardé: {output_file}")
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ DES PATTERNS EXTRAITS")
    print("="*60)
    
    if 'covid_urgences' in calibration['patterns']:
        p = calibration['patterns']['covid_urgences']
        print(f"\n📊 COVID Urgences:")
        print(f"   Facteur pic épidémique: {p.get('peak_factor', 'N/A')}x")
    
    if 'grippe' in calibration['patterns']:
        p = calibration['patterns']['grippe']
        print(f"\n🤧 Grippe (Sentinelles):")
        print(f"   Incidence moyenne: {p.get('annual_mean_inc100', 'N/A')}/100k")
        print(f"   Incidence max: {p.get('max_inc100', 'N/A')}/100k")
        print(f"   Semaines pics: {p.get('peak_weeks', [])[:5]}")
    
    if 'hospitalisations' in calibration['patterns']:
        p = calibration['patterns']['hospitalisations']
        print(f"\n🏥 Hospitalisations Paris:")
        print(f"   Moyenne quotidienne: {p.get('paris_mean_daily_hosp', 'N/A')}")
        print(f"   Pic quotidien: {p.get('paris_max_daily_hosp', 'N/A')}")
        print(f"   Ratio réa: {p.get('rea_ratio', 'N/A'):.1%}")
    
    return calibration


if __name__ == "__main__":
    generate_calibration_file()
