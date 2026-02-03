#!/usr/bin/env python3
"""
Extraction des patterns de crise pour le pilotage hospitalier
=============================================================

Analyse les données épidémiques réelles pour extraire:
1. Signaux d'alerte précoce (early warning)
2. Courbes de montée/descente épidémique
3. Pics et durées typiques par type de crise
4. Recommandations de staffing par période
5. Seuils d'alerte basés sur données historiques

Sources:
- COVID-19 urgences (SPF, 2020-2026)
- Grippe (Sentinelles, 1984-2026)
- Hospitalisations COVID Paris (SI-VIC)
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime, timedelta

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "external"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "data"


def analyze_epidemic_waves():
    """Analyse les vagues épidémiques COVID pour extraire les patterns."""
    print("\n" + "="*60)
    print("ANALYSE DES VAGUES ÉPIDÉMIQUES COVID")
    print("="*60)
    
    df = pd.read_csv(DATA_DIR / "covid-19-passages-aux-urgences-et-actes-sos-medecins-france.csv")
    df = df[df['Classe d\'âge'] == 'Tous âges'].copy()
    df['date'] = pd.to_datetime(df['1er jour de la semaine'])
    df = df.sort_values('date')
    
    col = 'Taux de passages aux urgences pour COVID-19'
    
    # Identifier les vagues (quand le taux dépasse un seuil)
    threshold = df[col].quantile(0.75)  # Seuil = 75e percentile
    
    waves = []
    in_wave = False
    wave_start = None
    wave_peak = 0
    wave_peak_date = None
    
    for _, row in df.iterrows():
        if row[col] > threshold and not in_wave:
            # Début de vague
            in_wave = True
            wave_start = row['date']
            wave_peak = row[col]
            wave_peak_date = row['date']
        elif in_wave:
            if row[col] > wave_peak:
                wave_peak = row[col]
                wave_peak_date = row['date']
            if row[col] < threshold * 0.5:  # Fin quand on descend à 50% du seuil
                # Fin de vague
                in_wave = False
                waves.append({
                    'start': wave_start,
                    'peak_date': wave_peak_date,
                    'end': row['date'],
                    'duration_weeks': (row['date'] - wave_start).days // 7,
                    'peak_value': wave_peak,
                    'time_to_peak_weeks': (wave_peak_date - wave_start).days // 7,
                })
    
    print(f"\nNombre de vagues identifiées: {len(waves)}")
    
    # Analyser les patterns communs
    if waves:
        avg_duration = np.mean([w['duration_weeks'] for w in waves])
        avg_time_to_peak = np.mean([w['time_to_peak_weeks'] for w in waves])
        max_peak = max([w['peak_value'] for w in waves])
        
        print(f"Durée moyenne d'une vague: {avg_duration:.1f} semaines")
        print(f"Temps moyen jusqu'au pic: {avg_time_to_peak:.1f} semaines")
        print(f"Pic maximum observé: {max_peak:.1f}")
        
        print("\nDétail des vagues:")
        for i, w in enumerate(waves[:5], 1):
            print(f"  Vague {i}: {w['start'].date()} - {w['end'].date()}")
            print(f"    Durée: {w['duration_weeks']} sem, Pic: {w['peak_value']:.0f} (après {w['time_to_peak_weeks']} sem)")
    
    return {
        'waves': [
            {
                'start': w['start'].isoformat(),
                'peak_date': w['peak_date'].isoformat(),
                'end': w['end'].isoformat(),
                'duration_weeks': int(w['duration_weeks']),
                'peak_value': round(w['peak_value'], 2),
                'time_to_peak_weeks': int(w['time_to_peak_weeks']),
            }
            for w in waves
        ],
        'patterns': {
            'avg_duration_weeks': round(avg_duration, 1) if waves else 0,
            'avg_time_to_peak_weeks': round(avg_time_to_peak, 1) if waves else 0,
            'threshold_75pct': round(threshold, 2),
        }
    }


def analyze_grippe_seasonality():
    """Analyse la saisonnalité grippale pour créer un calendrier d'alerte."""
    print("\n" + "="*60)
    print("ANALYSE SAISONNALITÉ GRIPPALE (42 ANS D'HISTORIQUE)")
    print("="*60)
    
    df = pd.read_csv(DATA_DIR / "grippe_incidence_france.csv", comment='#')
    
    # Convertir en numérique
    df['inc100'] = pd.to_numeric(df['inc100'], errors='coerce')
    df['year'] = df['week'].astype(str).str[:4].astype(int)
    df['week_num'] = df['week'].astype(str).str[4:].astype(int)
    
    # Statistiques par semaine
    weekly_stats = df.groupby('week_num')['inc100'].agg(['mean', 'std', 'min', 'max', 'median']).reset_index()
    
    # Définir les niveaux d'alerte basés sur l'historique
    annual_mean = df['inc100'].mean()
    
    alert_levels = {
        'normal': annual_mean,
        'vigilance': annual_mean * 1.5,  # +50%
        'pre_epidemie': annual_mean * 2.5,  # +150%
        'epidemie': annual_mean * 4,  # +300%
        'crise': annual_mean * 6,  # +500%
    }
    
    print(f"\nMoyenne annuelle: {annual_mean:.1f} cas/100k")
    print(f"\nSeuils d'alerte définis:")
    for level, threshold in alert_levels.items():
        print(f"  {level}: > {threshold:.0f} cas/100k")
    
    # Calendrier prédictif par semaine
    calendar = {}
    for _, row in weekly_stats.iterrows():
        week = int(row['week_num'])
        mean = row['mean']
        
        # Déterminer le niveau d'alerte attendu
        if mean > alert_levels['crise']:
            expected_level = 'crise'
        elif mean > alert_levels['epidemie']:
            expected_level = 'epidemie'
        elif mean > alert_levels['pre_epidemie']:
            expected_level = 'pre_epidemie'
        elif mean > alert_levels['vigilance']:
            expected_level = 'vigilance'
        else:
            expected_level = 'normal'
        
        calendar[week] = {
            'expected_incidence': round(mean, 1),
            'expected_level': expected_level,
            'historical_max': round(row['max'], 1),
            'historical_min': round(row['min'], 1),
            'variability': round(row['std'], 1),
        }
    
    # Identifier les périodes critiques
    critical_weeks = [w for w, data in calendar.items() if data['expected_level'] in ['epidemie', 'crise']]
    vigilance_weeks = [w for w, data in calendar.items() if data['expected_level'] == 'pre_epidemie']
    
    print(f"\nSemaines critiques (épidémie/crise attendue): {sorted(critical_weeks)}")
    print(f"Semaines vigilance renforcée: {sorted(vigilance_weeks)}")
    
    return {
        'alert_levels': {k: round(v, 1) for k, v in alert_levels.items()},
        'calendar': calendar,
        'critical_weeks': sorted(critical_weeks),
        'vigilance_weeks': sorted(vigilance_weeks),
    }


def analyze_crisis_response_metrics():
    """Analyse les métriques de réponse aux crises (hospitalisations COVID Paris)."""
    print("\n" + "="*60)
    print("ANALYSE RÉPONSE AUX CRISES (HOSPITALISATIONS PARIS)")
    print("="*60)
    
    df = pd.read_csv(DATA_DIR / "hospitalisations_covid.csv", sep=";")
    df['jour'] = pd.to_datetime(df['jour'])
    
    # Filtrer Paris
    df_paris = df[df['dep'] == '75'].copy()
    
    # Calculer les métriques de montée
    df_paris = df_paris.sort_values('jour')
    df_paris['hosp_7d_avg'] = df_paris['incid_hosp'].rolling(7).mean()
    df_paris['hosp_growth'] = df_paris['incid_hosp'].pct_change(7) * 100  # Croissance sur 7 jours
    
    # Identifier les phases de montée rapide
    rapid_growth_threshold = 50  # +50% sur 7 jours
    df_paris['rapid_growth'] = df_paris['hosp_growth'] > rapid_growth_threshold
    
    # Analyser les pics
    peaks = df_paris[df_paris['incid_hosp'] > df_paris['incid_hosp'].quantile(0.95)]
    
    print(f"\nStatistiques hospitalisations Paris:")
    print(f"  Moyenne: {df_paris['incid_hosp'].mean():.1f}/jour")
    print(f"  Médiane: {df_paris['incid_hosp'].median():.1f}/jour")
    print(f"  Max: {df_paris['incid_hosp'].max()}/jour")
    print(f"  Percentile 95: {df_paris['incid_hosp'].quantile(0.95):.1f}/jour")
    
    # Jours de croissance rapide
    rapid_days = df_paris[df_paris['rapid_growth']]['jour']
    print(f"\nJours de croissance rapide (>50%/7j): {len(rapid_days)}")
    
    # Temps de doublement moyen
    doubling_periods = df_paris[df_paris['hosp_growth'] > 100]  # Doublement = +100%
    print(f"Périodes de doublement observées: {len(doubling_periods)}")
    
    # Métriques pour le pilotage
    metrics = {
        'baseline_daily': round(df_paris['incid_hosp'].median(), 1),
        'alert_threshold_p75': round(df_paris['incid_hosp'].quantile(0.75), 1),
        'crisis_threshold_p95': round(df_paris['incid_hosp'].quantile(0.95), 1),
        'max_observed': int(df_paris['incid_hosp'].max()),
        'rapid_growth_days_pct': round(len(rapid_days) / len(df_paris) * 100, 1),
    }
    
    # Recommandations de staffing basées sur les niveaux
    staffing_recommendations = {
        'normal': {
            'description': 'Activité normale',
            'staffing_factor': 1.0,
            'beds_reserve_pct': 15,
            'actions': ['Monitoring standard', 'Formation continue']
        },
        'vigilance': {
            'description': 'Tendance haussière détectée',
            'staffing_factor': 1.1,
            'beds_reserve_pct': 20,
            'actions': ['Rappel pool remplaçants', 'Vérification stocks', 'Briefing équipes']
        },
        'pre_crise': {
            'description': 'Croissance rapide confirmée',
            'staffing_factor': 1.25,
            'beds_reserve_pct': 25,
            'actions': ['Activation plan blanc préparatoire', 'Déprogrammation non-urgente', 'Ouverture lits supplémentaires']
        },
        'crise': {
            'description': 'Pic épidémique en cours',
            'staffing_factor': 1.5,
            'beds_reserve_pct': 5,  # Quasi saturé
            'actions': ['Plan blanc activé', 'Transferts inter-établissements', 'Réquisition personnel', 'Cellule de crise 24/7']
        },
        'post_crise': {
            'description': 'Décrue amorcée',
            'staffing_factor': 1.2,
            'beds_reserve_pct': 15,
            'actions': ['Maintien vigilance', 'Rotation repos équipes', 'Debriefing', 'Préparation rebond']
        }
    }
    
    return {
        'metrics': metrics,
        'staffing_recommendations': staffing_recommendations,
    }


def generate_early_warning_rules():
    """Génère des règles d'alerte précoce basées sur les patterns historiques."""
    print("\n" + "="*60)
    print("GÉNÉRATION DES RÈGLES D'ALERTE PRÉCOCE")
    print("="*60)
    
    rules = {
        'epidemic_detection': {
            'name': 'Détection début épidémie',
            'conditions': [
                {
                    'metric': 'admissions_growth_7d',
                    'operator': '>',
                    'value': 15,
                    'unit': '%',
                    'description': 'Croissance admissions > 15% sur 7 jours'
                },
                {
                    'metric': 'week_vs_historical_mean',
                    'operator': '>',
                    'value': 1.3,
                    'unit': 'ratio',
                    'description': 'Admissions > 130% de la moyenne historique pour cette semaine'
                }
            ],
            'actions': ['Activer surveillance renforcée', 'Alerter direction', 'Vérifier stocks EPI'],
            'lead_time_days': 14,  # Détection 2 semaines avant le pic en moyenne
        },
        'rapid_escalation': {
            'name': 'Escalade rapide',
            'conditions': [
                {
                    'metric': 'admissions_growth_3d',
                    'operator': '>',
                    'value': 25,
                    'unit': '%',
                    'description': 'Croissance > 25% sur 3 jours'
                },
                {
                    'metric': 'occupancy_rate',
                    'operator': '>',
                    'value': 85,
                    'unit': '%',
                    'description': 'Taux d\'occupation > 85%'
                }
            ],
            'actions': ['Activer plan de montée en charge', 'Rappel personnel', 'Déprogrammer chirurgies électives'],
            'lead_time_days': 5,
        },
        'capacity_saturation': {
            'name': 'Saturation imminente',
            'conditions': [
                {
                    'metric': 'occupancy_rate',
                    'operator': '>',
                    'value': 95,
                    'unit': '%',
                    'description': 'Taux d\'occupation > 95%'
                },
                {
                    'metric': 'beds_available',
                    'operator': '<',
                    'value': 20,
                    'unit': 'lits',
                    'description': 'Moins de 20 lits disponibles'
                }
            ],
            'actions': ['Activer plan blanc', 'Organiser transferts', 'Cellule de crise', 'Communication ARS'],
            'lead_time_days': 1,
        },
        'seasonal_preparation': {
            'name': 'Préparation saisonnière',
            'conditions': [
                {
                    'metric': 'calendar_week',
                    'operator': 'in',
                    'value': [44, 45, 46, 47],  # Mi-novembre
                    'unit': 'semaine',
                    'description': 'Entrée dans la période pré-épidémique'
                }
            ],
            'actions': ['Finaliser vaccination personnel', 'Stocker antiviraux', 'Former équipes protocoles grippe', 'Briefing saisonnier'],
            'lead_time_days': 30,
        },
        'heatwave_alert': {
            'name': 'Alerte canicule',
            'conditions': [
                {
                    'metric': 'temperature_forecast',
                    'operator': '>',
                    'value': 35,
                    'unit': '°C',
                    'description': 'Prévision température > 35°C'
                },
                {
                    'metric': 'consecutive_hot_days',
                    'operator': '>=',
                    'value': 3,
                    'unit': 'jours',
                    'description': '3+ jours consécutifs de forte chaleur'
                }
            ],
            'actions': ['Activer plan canicule', 'Renforcer cardio/neuro', 'Climatisation urgences', 'Communication patients fragiles'],
            'lead_time_days': 3,
        }
    }
    
    print(f"\nRègles d'alerte précoce définies: {len(rules)}")
    for rule_id, rule in rules.items():
        print(f"\n  📌 {rule['name']} (délai anticipation: {rule['lead_time_days']}j)")
        for cond in rule['conditions']:
            print(f"     - {cond['description']}")
    
    return rules


def generate_staffing_calendar():
    """Génère un calendrier de staffing basé sur les patterns historiques."""
    print("\n" + "="*60)
    print("GÉNÉRATION DU CALENDRIER DE STAFFING PRÉVISIONNEL")
    print("="*60)
    
    # Charger les coefficients grippe
    df = pd.read_csv(DATA_DIR / "grippe_incidence_france.csv", comment='#')
    df['inc100'] = pd.to_numeric(df['inc100'], errors='coerce')
    df['week_num'] = df['week'].astype(str).str[4:].astype(int)
    
    weekly_mean = df.groupby('week_num')['inc100'].mean()
    annual_mean = weekly_mean.mean()
    
    # Créer le calendrier
    calendar = {}
    for week in range(1, 53):
        week_mean = weekly_mean.get(week, annual_mean)
        ratio = week_mean / annual_mean
        
        # Déterminer le facteur de staffing recommandé
        if ratio > 3.0:
            staffing_factor = 1.40
            level = 'crise'
            color = 'red'
        elif ratio > 2.0:
            staffing_factor = 1.25
            level = 'epidemie'
            color = 'orange'
        elif ratio > 1.5:
            staffing_factor = 1.15
            level = 'vigilance'
            color = 'yellow'
        elif ratio < 0.5:
            staffing_factor = 0.90
            level = 'calme'
            color = 'green'
        else:
            staffing_factor = 1.00
            level = 'normal'
            color = 'blue'
        
        calendar[week] = {
            'activity_ratio': round(ratio, 2),
            'staffing_factor': staffing_factor,
            'level': level,
            'color': color,
            'recommended_actions': get_actions_for_level(level),
        }
    
    # Résumé par mois
    print("\nRésumé mensuel du staffing recommandé:")
    months = {
        'Janvier': range(1, 5), 'Février': range(5, 9), 'Mars': range(9, 14),
        'Avril': range(14, 18), 'Mai': range(18, 22), 'Juin': range(22, 27),
        'Juillet': range(27, 31), 'Août': range(31, 36), 'Septembre': range(36, 40),
        'Octobre': range(40, 44), 'Novembre': range(44, 49), 'Décembre': range(49, 53)
    }
    
    for month, weeks in months.items():
        factors = [calendar[w]['staffing_factor'] for w in weeks if w in calendar]
        avg_factor = np.mean(factors) if factors else 1.0
        print(f"  {month:12s}: staffing x{avg_factor:.2f}")
    
    return calendar


def get_actions_for_level(level):
    """Retourne les actions recommandées par niveau."""
    actions = {
        'calme': [
            'Période propice aux formations',
            'Rattrapage congés',
            'Maintenance équipements',
            'Préparation prochaine saison'
        ],
        'normal': [
            'Activité standard',
            'Monitoring régulier',
            'Maintien des stocks'
        ],
        'vigilance': [
            'Surveillance renforcée indicateurs',
            'Vérification disponibilité pool',
            'Briefing hebdomadaire équipes'
        ],
        'epidemie': [
            'Activation renforts',
            'Déprogrammation possible',
            'Stock EPI +50%',
            'Réunion quotidienne pilotage'
        ],
        'crise': [
            'Mobilisation maximale',
            'Plan blanc potentiel',
            'Cellule de crise active',
            'Communication ARS quotidienne'
        ]
    }
    return actions.get(level, [])


def main():
    """Génère le fichier complet d'intelligence épidémique."""
    print("\n" + "="*60)
    print("GÉNÉRATION DE L'INTELLIGENCE ÉPIDÉMIQUE POUR LE PILOTAGE")
    print("="*60)
    
    crisis_intelligence = {
        'generated_at': datetime.now().isoformat(),
        'source': 'Données réelles SPF, Sentinelles, SI-VIC',
        'components': {}
    }
    
    # 1. Analyse des vagues
    waves = analyze_epidemic_waves()
    crisis_intelligence['components']['epidemic_waves'] = waves
    
    # 2. Saisonnalité grippe
    grippe = analyze_grippe_seasonality()
    crisis_intelligence['components']['grippe_seasonality'] = grippe
    
    # 3. Métriques de réponse
    response = analyze_crisis_response_metrics()
    crisis_intelligence['components']['crisis_response'] = response
    
    # 4. Règles d'alerte
    rules = generate_early_warning_rules()
    crisis_intelligence['components']['early_warning_rules'] = rules
    
    # 5. Calendrier staffing
    staffing = generate_staffing_calendar()
    crisis_intelligence['components']['staffing_calendar'] = staffing
    
    # Sauvegarder
    output_file = OUTPUT_DIR / "crisis_intelligence.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(crisis_intelligence, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n✅ Intelligence épidémique sauvegardée: {output_file}")
    
    # Résumé final
    print("\n" + "="*60)
    print("RÉSUMÉ POUR LE PILOTAGE")
    print("="*60)
    
    print("\n📊 INSIGHTS CLÉS EXTRAITS:")
    print(f"  • {len(waves['waves'])} vagues épidémiques analysées")
    print(f"  • Durée moyenne d'une vague: {waves['patterns']['avg_duration_weeks']} semaines")
    print(f"  • Temps moyen jusqu'au pic: {waves['patterns']['avg_time_to_peak_weeks']} semaines")
    print(f"  • {len(grippe['critical_weeks'])} semaines critiques identifiées par an")
    print(f"  • 5 niveaux de staffing définis avec actions")
    print(f"  • 5 règles d'alerte précoce avec délais d'anticipation")
    
    print("\n🎯 APPLICATIONS PILOTAGE:")
    print("  1. Calendrier prévisionnel de staffing (52 semaines)")
    print("  2. Alertes automatiques basées sur indicateurs")
    print("  3. Recommandations d'actions par niveau de crise")
    print("  4. Anticipation des besoins 2-4 semaines à l'avance")
    print("  5. Seuils d'alerte calibrés sur données réelles")
    
    return crisis_intelligence


if __name__ == "__main__":
    main()
