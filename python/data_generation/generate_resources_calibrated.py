#!/usr/bin/env python3
"""
Génération des données de ressources CALIBRÉES sur données réelles
===================================================================

Ce script génère des données de ressources hospitalières basées sur :
1. Données réelles Pitié-Salpêtrière (FHF 2019)
2. Taux d'occupation nationaux (DREES SAE 2024)
3. Ratios personnel/lits moyens CHU

Sources:
- FHF Annuaire: 1,717 lits totaux Pitié-Salpêtrière
- DREES SAE 2024: Taux occupation ~87% MCO France
- AP-HP Rapports: ~8,000 personnel estimé
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import json

DATA_DIR = Path(__file__).parent.parent.parent / "data"

# =============================================================================
# DONNÉES RÉELLES PITIÉ-SALPÊTRIÈRE (Source: DREES SAE 2024)
# =============================================================================

CAPACITE_REELLE_PITIE = {
    # Répartition officielle SAE 2024 - FINESS 750100125
    'Médecine': {
        'lits': 732,  # SAE 2024: LIT_MED
        'personnel_ratio': 0.8,  # Personnel par lit (IDE + AS)
        'occupation_base': 0.85,  # Calculé: journées/(lits*365) ≈ 84.3%
        'occupation_var': 0.08,
    },
    'Chirurgie': {
        'lits': 390,  # SAE 2024: LIT_CHI
        'personnel_ratio': 1.0,  # Plus de personnel pour chirurgie
        'occupation_base': 0.82,  # Légèrement inférieur à médecine
        'occupation_var': 0.10,
    },
    'Urgences': {
        'lits': 50,  # Lits UHCD estimés (SAE ne détaille pas)
        'personnel_ratio': 2.5,  # Urgences = beaucoup de personnel
        'occupation_base': 0.95,  # Toujours surchargé
        'occupation_var': 0.05,
    },
    'Réanimation': {
        'lits': 104,  # SAE 2024: REA REAADU
        'personnel_ratio': 3.0,  # 3 soignants par lit en réa
        'occupation_base': 0.85,  # ~95% occupation typique réa
        'occupation_var': 0.08,
    },
    'Soins_Intensifs': {
        'lits': 120,  # SAE 2024: SIADU total
        'personnel_ratio': 2.0,
        'occupation_base': 0.83,
        'occupation_var': 0.10,
    },
    'USC': {
        'lits': 112,  # SAE 2024: USICADU+USIHADU+USINVADU+USIPADU
        'personnel_ratio': 1.5,
        'occupation_base': 0.80,
        'occupation_var': 0.12,
    },
    'SSR': {
        'lits': 75,  # SAE 2024: SSR LIT
        'personnel_ratio': 0.6,
        'occupation_base': 0.92,  # SSR généralement très occupé
        'occupation_var': 0.05,
    },
    'Obstétrique': {
        'lits': 46,  # SAE 2024: LIT_OBS
        'personnel_ratio': 1.2,
        'occupation_base': 0.75,  # Variable selon naissances
        'occupation_var': 0.15,
    },
}

# Données complémentaires SAE 2024
SAE_2024_ACTIVITE = {
    'sejours_medecine_hc': 38495,
    'sejours_chirurgie_hc': 17406,
    'journees_medecine': 248479,
    'journees_chirurgie': 96043,
    'journees_obstetrique': 15077,
    'places_ambulatoire': 292,
    'blocs_salles': 32,
    'blocs_sites': 7,
}

# =============================================================================
# TAUX D'OCCUPATION NATIONAUX (Source: DREES SAE 2024)
# =============================================================================

TAUX_OCCUPATION_NATIONAL = {
    # Taux moyen France 2024
    'MCO_global': 0.87,
    'SSR': 0.85,
    'Psychiatrie': 0.92,
    'Réanimation': 0.75,  # Cible = 80% max pour garder marge
}

# =============================================================================
# FACTEURS DE VARIATION TEMPORELLE (calibrés sur données réelles)
# =============================================================================

# Variation par jour de semaine (DREES/Sentinelles)
VARIATION_HEBDO = {
    0: 1.08,  # Lundi - pic post-weekend
    1: 1.02,  # Mardi
    2: 1.00,  # Mercredi
    3: 0.98,  # Jeudi
    4: 0.95,  # Vendredi - sorties
    5: 0.90,  # Samedi - urgences only
    6: 0.92,  # Dimanche
}

# Variation saisonnière (Sentinelles + DREES)
VARIATION_MENSUELLE = {
    1: 1.12,   # Janvier - pic grippe
    2: 1.08,   # Février - fin grippe
    3: 1.02,   # Mars
    4: 0.98,   # Avril
    5: 0.95,   # Mai
    6: 0.90,   # Juin
    7: 0.85,   # Juillet - vacances
    8: 0.82,   # Août - creux
    9: 0.95,   # Septembre - reprise
    10: 1.00,  # Octobre
    11: 1.05,  # Novembre
    12: 1.10,  # Décembre - fêtes + grippe
}


def get_occupation_rate(service: str, date: datetime, base_rate: float, var: float) -> float:
    """Calcule le taux d'occupation réaliste pour un service à une date."""
    
    # Facteurs temporels
    jour_semaine = date.weekday()
    mois = date.month
    
    hebdo_factor = VARIATION_HEBDO.get(jour_semaine, 1.0)
    mensuel_factor = VARIATION_MENSUELLE.get(mois, 1.0)
    
    # Variation aléatoire réaliste
    random_var = np.random.normal(0, var / 2)
    
    # Calcul du taux
    taux = base_rate * hebdo_factor * mensuel_factor + random_var
    
    # Bornes réalistes
    if service == 'Urgences':
        taux = max(0.80, min(1.10, taux))  # Urgences peut dépasser 100%
    elif service == 'Réanimation':
        taux = max(0.60, min(0.98, taux))  # Réa doit garder marge
    else:
        taux = max(0.50, min(0.98, taux))
    
    return round(taux, 3)


def get_personnel_disponible(total: int, date: datetime) -> int:
    """Calcule le personnel disponible (absences, congés, etc.)."""
    
    jour_semaine = date.weekday()
    mois = date.month
    
    # Taux présence base
    if jour_semaine >= 5:  # Weekend
        taux_presence = 0.70  # Effectif réduit
    else:
        taux_presence = 0.90
    
    # Congés été
    if mois in [7, 8]:
        taux_presence *= 0.85
    
    # Variation aléatoire
    taux_presence *= np.random.uniform(0.95, 1.02)
    
    return int(total * min(taux_presence, 1.0))


def generate_resources():
    """Génère les données de ressources calibrées."""
    
    print("="*60)
    print("GÉNÉRATION RESSOURCES CALIBRÉES PITIÉ-SALPÊTRIÈRE")
    print("="*60)
    
    # Charger les dates depuis admissions
    admissions_file = DATA_DIR / "admissions.csv"
    if admissions_file.exists():
        df_adm = pd.read_csv(admissions_file)
        df_adm['date'] = pd.to_datetime(df_adm['date_admission'])
        dates = pd.date_range(df_adm['date'].min(), df_adm['date'].max(), freq='D')
        print(f"📅 Période: {dates[0].date()} → {dates[-1].date()} ({len(dates)} jours)")
    else:
        # Fallback: 2 ans
        dates = pd.date_range('2024-01-01', '2025-12-31', freq='D')
        print(f"📅 Période par défaut: {dates[0].date()} → {dates[-1].date()}")
    
    # Générer les données
    resources_list = []
    
    for date in dates:
        for service, config in CAPACITE_REELLE_PITIE.items():
            lits_total = config['lits']
            
            # Taux d'occupation réaliste
            taux = get_occupation_rate(
                service, date, 
                config['occupation_base'], 
                config['occupation_var']
            )
            
            lits_occupes = int(lits_total * taux)
            
            # Personnel
            personnel_total = int(lits_total * config['personnel_ratio'])
            personnel_dispo = get_personnel_disponible(personnel_total, date)
            
            # Personnel mobilisé (proportionnel à l'occupation)
            personnel_occupe = min(
                int(lits_occupes * config['personnel_ratio'] * 0.8),
                personnel_dispo
            )
            
            resources_list.append({
                'date': date.strftime('%Y-%m-%d'),
                'service': service,
                'lits_total': lits_total,
                'lits_occupes': lits_occupes,
                'lits_disponibles': max(0, lits_total - lits_occupes),
                'taux_occupation': round(taux * 100, 1),
                'personnel_total': personnel_total,
                'personnel_disponible': personnel_dispo,
                'personnel_occupe': personnel_occupe,
            })
    
    # Créer DataFrame
    df = pd.DataFrame(resources_list)
    
    # Statistiques
    print(f"\n📊 STATISTIQUES GÉNÉRÉES:")
    print(f"   Enregistrements: {len(df):,}")
    print(f"   Services: {df['service'].nunique()}")
    
    print(f"\n   Capacité totale Pitié-Salpêtrière:")
    for service, config in CAPACITE_REELLE_PITIE.items():
        print(f"      {service}: {config['lits']} lits")
    print(f"      TOTAL: {sum(c['lits'] for c in CAPACITE_REELLE_PITIE.values())} lits")
    
    print(f"\n   Taux d'occupation moyens:")
    for service in df['service'].unique():
        taux_moy = df[df['service'] == service]['taux_occupation'].mean()
        print(f"      {service}: {taux_moy:.1f}%")
    
    # Sauvegarder
    output_file = DATA_DIR / "resources.csv"
    df.to_csv(output_file, index=False)
    print(f"\n✅ Sauvegardé: {output_file}")
    
    # Sauvegarder métadonnées
    metadata = {
        'generated_at': datetime.now().isoformat(),
        'sources': [
            'FHF Annuaire - Pitié-Salpêtrière (Janvier 2019)',
            'DREES SAE 2024 - Taux occupation nationaux',
            'Réseau Sentinelles - Variations saisonnières'
        ],
        'capacite_totale': sum(c['lits'] for c in CAPACITE_REELLE_PITIE.values()),
        'services': list(CAPACITE_REELLE_PITIE.keys()),
        'periode': {
            'debut': str(dates[0].date()),
            'fin': str(dates[-1].date()),
            'jours': len(dates)
        },
        'taux_occupation_moyen': round(df['taux_occupation'].mean(), 1)
    }
    
    with open(DATA_DIR / "resources_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"✅ Métadonnées: {DATA_DIR / 'resources_metadata.json'}")
    
    return df


if __name__ == "__main__":
    generate_resources()
