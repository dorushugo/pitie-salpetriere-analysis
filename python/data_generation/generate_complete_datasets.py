"""
Génération des datasets complets pour Pitié-Salpêtrière
- etablissement.csv : 1 ligne = 1 jour
- admissions_complet.csv : 1 ligne = 1 patient

PÉRIODE: 2020-01-01 → 2025-12-31 (6 ans)
CORRÉLATIONS: Personnel, admissions, occupation évoluent ensemble
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import random

# Charger les données réelles Hospi-Diag
with open('../../data/hospidiag_pitie_2020_2023.json') as f:
    HD = json.load(f)

# ============================================================================
# CONFIGURATION AVEC ÉVOLUTION ANNUELLE
# ============================================================================

# Taux de croissance annuels (basés sur tendances nationales)
CROISSANCE = {
    'admissions': 0.02,      # +2%/an tendance démographique
    'personnel_medical': 0.025,  # +2.5%/an recrutements
    'personnel_non_medical': 0.015,  # +1.5%/an
    'lits': 0.01,            # +1%/an capacité
}

# Configuration de base 2020 (on recule depuis 2023)
def get_config_for_year(year):
    """Retourne la config ajustée pour une année donnée."""
    years_from_2023 = year - 2023
    
    # Facteur d'évolution (depuis 2023)
    factor_adm = (1 + CROISSANCE['admissions']) ** years_from_2023
    factor_med = (1 + CROISSANCE['personnel_medical']) ** years_from_2023
    factor_nonmed = (1 + CROISSANCE['personnel_non_medical']) ** years_from_2023
    factor_lits = (1 + CROISSANCE['lits']) ** years_from_2023
    
    return {
        'lits': {
            'medecine': {'total': int(742 * factor_lits), 'taux_occ_base': 0.67},
            'chirurgie': {'total': int(385 * factor_lits), 'taux_occ_base': 0.85},
            'reanimation': {'total': int(104 * factor_lits), 'taux_occ_base': 0.85},
            'soins_intensifs': {'total': int(70 * factor_lits), 'taux_occ_base': 0.82},
            'usc': {'total': int(49 * factor_lits), 'taux_occ_base': 0.78},
            'obstetrique': {'total': int(48 * factor_lits), 'taux_occ_base': 0.68},
        },
        'personnel': {
            'medecins': int(479 * factor_med),
            'chirurgiens': int(120 * factor_med),
            'anesthesistes': int(122 * factor_med),
            'gyneco_obstetriciens': int(13 * factor_med),
            'administratifs': int(745 * factor_nonmed),
            'soins': int(4716 * factor_nonmed),
            'educatifs_sociaux': int(87 * factor_nonmed),
            'medico_techniques': int(598 * factor_nonmed),
            'techniques_ouvriers': int(953 * factor_nonmed),
        },
        'equipements': {
            'scanners': 7 + max(0, (year - 2022)),  # +1 scanner en 2023, 2024, 2025
            'irm': 6 + max(0, (year - 2023)),       # +1 IRM en 2024, 2025
            'tep_scan': 3,
            'salles_radio_vasculaire': 7,
            'salles_bloc': 53 + max(0, (year - 2021) // 2),  # +1 tous les 2 ans
        },
        'admissions_jour_base': int(450 * factor_adm),
    }

# Événements spéciaux historiques (2020-2025)
EVENEMENTS = {
    # COVID vagues 2020-2022
    '2020-03-15': ('covid_vague1', 60),
    '2020-10-15': ('covid_vague2', 90),
    '2021-03-01': ('covid_vague3', 60),
    '2021-12-15': ('covid_omicron', 45),
    '2022-06-15': ('covid_ba5', 30),
    # Canicules
    '2020-08-01': ('canicule', 14),
    '2021-06-15': ('canicule', 10),
    '2022-07-15': ('canicule', 21),
    '2023-08-20': ('canicule', 14),
    '2024-07-01': ('canicule', 18),
    '2025-07-15': ('canicule', 12),
    # Grippe saisonnière
    '2020-01-10': ('grippe', 45),
    '2021-12-01': ('grippe', 60),
    '2022-12-15': ('grippe', 45),
    '2023-12-01': ('grippe', 50),
    '2024-12-10': ('grippe', 55),
    '2025-01-05': ('grippe', 40),
    # Bronchiolite
    '2022-10-15': ('bronchiolite', 60),
    '2023-10-20': ('bronchiolite', 55),
    '2024-10-01': ('bronchiolite', 50),
    '2025-10-15': ('bronchiolite', 45),
    # Gastro-entérite (nouveau)
    '2020-02-01': ('gastro', 21),
    '2021-01-15': ('gastro', 18),
    '2022-01-20': ('gastro', 20),
    '2023-02-01': ('gastro', 15),
    '2024-01-25': ('gastro', 22),
    '2025-02-10': ('gastro', 18),
}

def get_evenement(date):
    """Retourne l'événement spécial pour une date donnée."""
    for start_str, (event, duration) in EVENEMENTS.items():
        start = datetime.strptime(start_str, '%Y-%m-%d')
        end = start + timedelta(days=duration)
        if start <= date < end:
            return event
    return 'normal'

def get_saison(date):
    """Retourne la saison."""
    month = date.month
    if month in [12, 1, 2]:
        return 'hiver'
    elif month in [3, 4, 5]:
        return 'printemps'
    elif month in [6, 7, 8]:
        return 'ete'
    else:
        return 'automne'

def get_event_factor(evenement):
    """Retourne le facteur multiplicatif pour un événement."""
    factors = {
        'covid_vague1': 1.45,
        'covid_vague2': 1.30,
        'covid_vague3': 1.25,
        'covid_omicron': 1.20,
        'covid_ba5': 1.15,
        'canicule': 1.18,
        'grippe': 1.22,
        'bronchiolite': 1.15,
        'gastro': 1.12,
        'normal': 1.0,
    }
    return factors.get(evenement, 1.0)

# ============================================================================
# GÉNÉRATION FICHIER ÉTABLISSEMENT
# ============================================================================

def generate_etablissement():
    """Génère le fichier établissement (1 ligne = 1 jour) de 2020 à 2025."""
    print("📊 Génération fichier établissement...")
    
    start_date = datetime(2020, 1, 1)
    end_date = datetime(2025, 12, 31)
    
    data = []
    current = start_date
    
    # Variables pour corrélations
    prev_admissions = 450
    stock_sang_base = 500
    
    while current <= end_date:
        year = current.year
        config = get_config_for_year(year)
        
        evenement = get_evenement(current)
        saison = get_saison(current)
        dow = current.weekday()
        
        # Facteur événement
        event_factor = get_event_factor(evenement)
        
        # Facteur saisonnier
        season_factor = {'hiver': 1.15, 'printemps': 1.0, 'ete': 0.85, 'automne': 1.05}[saison]
        
        # Facteur jour de semaine (moins le weekend)
        dow_factor = 0.7 if dow >= 5 else 1.0
        
        row = {
            'date': current.strftime('%Y-%m-%d'),
            'annee': year,
            'mois': current.month,
            'jour_semaine': ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][dow],
            'saison': saison,
            'evenement_special': evenement,
        }
        
        # ===== ADMISSIONS (calculé en premier pour corrélations) =====
        adm_base = config['admissions_jour_base'] * event_factor * season_factor * dow_factor
        # Lissage avec jour précédent (corrélation temporelle)
        adm_smoothed = 0.7 * adm_base + 0.3 * prev_admissions
        admissions = int(adm_smoothed + np.random.normal(0, adm_smoothed * 0.08))
        admissions = max(50, admissions)
        row['nb_admissions'] = admissions
        prev_admissions = admissions
        
        # ===== LITS (corrélé aux admissions) =====
        # Tension sur les lits proportionnelle aux admissions
        tension_admissions = admissions / config['admissions_jour_base']  # >1 si beaucoup d'admissions
        
        for lit_type, lit_config in config['lits'].items():
            # Taux occupation = base × événement × saison × tension admissions
            taux = lit_config['taux_occ_base'] * event_factor * (0.5 + 0.5 * season_factor) * (0.8 + 0.2 * tension_admissions)
            taux = min(0.98, max(0.3, taux + np.random.normal(0, 0.04)))
            occupes = int(lit_config['total'] * taux)
            row[f'lits_{lit_type}_total'] = lit_config['total']
            row[f'lits_{lit_type}_occupes'] = occupes
            row[f'lits_{lit_type}_libres'] = lit_config['total'] - occupes
            row[f'taux_occ_{lit_type}'] = round(taux * 100, 1)
        
        # ===== PERSONNEL (corrélé aux événements et jour) =====
        # Plus de personnel présent lors d'événements/crises
        personnel_event_factor = 1.0 + (event_factor - 1) * 0.3  # Réponse amortie
        
        for cat, base in config['personnel'].items():
            # Variation selon événement et jour
            if dow >= 5:  # Weekend
                taux_presence = 0.65 + np.random.uniform(0, 0.10)
            else:
                taux_presence = 0.88 + np.random.uniform(0, 0.08)
            
            # Renforcement lors d'événements
            taux_presence *= min(1.0, personnel_event_factor)
            
            presents = int(base * taux_presence)
            taux_travail = round(0.80 + np.random.uniform(0, 0.18), 2)
            
            row[f'personnel_{cat}_effectif'] = base
            row[f'personnel_{cat}_presents'] = presents
            row[f'personnel_{cat}_taux_travail'] = taux_travail
        
        # ===== ÉQUIPEMENTS (évolution annuelle) =====
        for equip, nb in config['equipements'].items():
            row[f'nb_{equip}'] = nb
        
        # ===== EXAMENS (proportionnel aux admissions × gravité événement) =====
        exam_ratio = 1.5 + np.random.uniform(0, 0.5)
        if evenement != 'normal':
            exam_ratio *= 1.1  # Plus d'examens lors d'événements
        
        row['nb_examens_total'] = int(admissions * exam_ratio)
        row['nb_examens_scanner'] = int(row['nb_examens_total'] * (0.23 + np.random.uniform(0, 0.04)))
        row['nb_examens_irm'] = int(row['nb_examens_total'] * (0.13 + np.random.uniform(0, 0.04)))
        row['nb_examens_radio'] = int(row['nb_examens_total'] * (0.38 + np.random.uniform(0, 0.04)))
        row['nb_examens_autres'] = row['nb_examens_total'] - row['nb_examens_scanner'] - row['nb_examens_irm'] - row['nb_examens_radio']
        
        # ===== DÉCÈS (corrélé gravité événement) =====
        taux_graves = 0.05 if evenement == 'normal' else 0.07
        if evenement == 'covid_vague1':
            taux_graves = 0.12
        elif 'covid' in evenement:
            taux_graves = 0.08
        
        cas_graves = int(admissions * taux_graves)
        taux_mortalite_graves = 0.025 + np.random.uniform(0, 0.02)
        deces = int(cas_graves * taux_mortalite_graves)
        row['nb_deces'] = max(0, deces)
        
        # ===== STOCK SANG (corrélé activité - diminue quand forte activité) =====
        # Consommation proportionnelle aux cas graves
        consommation = cas_graves * 0.3
        renouvellement = 15 + np.random.uniform(0, 10)  # Dons quotidiens
        stock_sang_base = stock_sang_base - consommation + renouvellement
        stock_sang_base = max(300, min(700, stock_sang_base))  # Bornes
        
        row['stock_sang_poches'] = int(stock_sang_base + np.random.normal(0, 20))
        row['stock_sang_critique'] = row['stock_sang_poches'] < 400
        
        data.append(row)
        current += timedelta(days=1)
    
    df = pd.DataFrame(data)
    df.to_csv('../../data/etablissement.csv', index=False)
    print(f"   ✅ {len(df)} lignes générées → data/etablissement.csv")
    print(f"   📅 Période: 2020-01-01 → 2025-12-31")
    return df


# ============================================================================
# GÉNÉRATION FICHIER ADMISSIONS COMPLET
# ============================================================================

def generate_admissions_complet():
    """Génère le fichier admissions enrichi pour 2020-2025."""
    print("\n📊 Génération fichier admissions complet...")
    
    # Charger le fichier établissement pour avoir les stats par jour
    df_etab = pd.read_csv('../../data/etablissement.csv')
    df_etab['date'] = pd.to_datetime(df_etab['date'])
    
    # Créer un dictionnaire date -> nb_admissions pour générer le bon nombre
    admissions_par_jour = dict(zip(df_etab['date'], df_etab['nb_admissions']))
    
    # Services avec leurs poids (évolution dans le temps)
    SERVICES = {
        'Médecine': 0.25,
        'Chirurgie': 0.20,
        'Urgences': 0.18,
        'Réanimation': 0.05,
        'Cardiologie': 0.10,
        'Neurologie': 0.08,
        'Pédiatrie': 0.06,
        'Maladies Infectieuses': 0.08,
    }
    
    SERVICE_TO_LIT = {
        'Urgences': ['medecine', 'chirurgie', None],
        'Réanimation': ['reanimation', 'soins_intensifs'],
        'Cardiologie': ['medecine', 'soins_intensifs'],
        'Neurologie': ['medecine', 'soins_intensifs'],
        'Pédiatrie': ['medecine'],
        'Maladies Infectieuses': ['medecine'],
        'Médecine': ['medecine'],
        'Chirurgie': ['chirurgie'],
    }
    
    MOTIFS = [
        'Douleur thoracique', 'Dyspnée', 'Traumatisme', 'Infection',
        'Chirurgie programmée', 'Examen diagnostique', 'Suivi chronique',
        'AVC', 'Malaise', 'Douleur abdominale', 'Fracture', 'Grippe',
        'COVID-19', 'Pneumonie', 'Insuffisance cardiaque', 'Diabète décompensé'
    ]
    
    data = []
    patient_id = 100000
    
    for date in pd.date_range(start='2020-01-01', end='2025-12-31'):
        if date not in admissions_par_jour:
            continue
            
        nb_adm = admissions_par_jour[date]
        evenement = get_evenement(date)
        saison = get_saison(date)
        
        # Ajuster poids services selon événement
        services_weights = SERVICES.copy()
        if 'covid' in evenement:
            services_weights['Maladies Infectieuses'] *= 2
            services_weights['Réanimation'] *= 1.5
        elif evenement == 'grippe':
            services_weights['Maladies Infectieuses'] *= 1.5
        elif evenement == 'canicule':
            services_weights['Cardiologie'] *= 1.3
        
        # Normaliser poids
        total_weight = sum(services_weights.values())
        services_probs = [w/total_weight for w in services_weights.values()]
        services_list = list(services_weights.keys())
        
        for _ in range(nb_adm):
            patient_id += 1
            
            # Caractéristiques patient
            age = int(np.random.choice(
                [5, 15, 25, 35, 45, 55, 65, 75, 85],
                p=[0.05, 0.05, 0.10, 0.12, 0.15, 0.18, 0.18, 0.12, 0.05]
            ) + np.random.randint(-4, 5))
            age = max(0, min(99, age))
            
            sexe = np.random.choice(['M', 'F'], p=[0.48, 0.52])
            
            # Service
            service = np.random.choice(services_list, p=services_probs)
            
            # Type admission
            if service == 'Urgences':
                type_admission = 'Urgence'
            elif service in ['Chirurgie'] and np.random.random() > 0.3:
                type_admission = 'Programmé'
            elif np.random.random() > 0.7:
                type_admission = 'Transfert'
            else:
                type_admission = np.random.choice(['Urgence', 'Programmé'], p=[0.6, 0.4])
            
            # Gravité (corrélée à l'âge et événement)
            base_gravite = 2
            if age > 70:
                base_gravite += 1
            if evenement != 'normal':
                base_gravite += 0.5
            gravite = min(5, max(1, int(base_gravite + np.random.normal(0, 0.8))))
            
            # Durée séjour (corrélée gravité et âge)
            if service == 'Urgences' and type_admission == 'Urgence':
                duree = max(0, int(np.random.exponential(0.5)))  # Beaucoup de passages courts
            else:
                duree_base = gravite * 1.5 + age * 0.03
                duree = max(0, int(np.random.exponential(duree_base)))
            
            # Date sortie
            date_sortie = date + timedelta(days=duree)
            
            # Coût (corrélé durée et service)
            cout_base = 500 + duree * 800
            if service == 'Réanimation':
                cout_base *= 3
            elif service == 'Chirurgie':
                cout_base *= 1.8
            cout = int(cout_base * (0.8 + np.random.uniform(0, 0.4)))
            
            # Mode d'arrivée
            if type_admission == 'Urgence':
                mode = np.random.choice(['urgences_pied', 'urgences_ambulance', 'samu'], 
                                       p=[0.50, 0.35, 0.15])
            elif type_admission == 'Transfert':
                mode = 'transfert'
            else:
                mode = np.random.choice(['consultation', 'programme'], p=[0.25, 0.75])
            
            # Lit
            lit_options = SERVICE_TO_LIT.get(service, ['medecine'])
            if duree > 0:
                a_pris_lit = 'oui'
                type_lit = np.random.choice([l for l in lit_options if l])
            else:
                a_pris_lit = 'non'
                type_lit = None
            
            # Motif (adapté à l'événement)
            if 'covid' in evenement and np.random.random() > 0.5:
                motif = 'COVID-19'
            elif evenement == 'grippe' and np.random.random() > 0.6:
                motif = np.random.choice(['Grippe', 'Pneumonie'])
            else:
                motif = np.random.choice(MOTIFS)
            
            # Examens (corrélé gravité et durée)
            if gravite >= 4:
                nb_exam = np.random.randint(2, 6)
            elif gravite >= 3:
                nb_exam = np.random.randint(1, 4)
            elif gravite >= 2:
                nb_exam = np.random.randint(0, 3)
            else:
                nb_exam = np.random.randint(0, 2)
            
            if nb_exam > 0:
                types_exam = np.random.choice(
                    ['radio', 'scanner', 'irm', 'echo', 'biologie', 'ecg'],
                    size=min(nb_exam, 4), replace=False
                )
                types_examens = ','.join(types_exam)
            else:
                types_examens = ''
            
            row = {
                'id_patient': f'P{patient_id}',
                'date_admission': date.strftime('%Y-%m-%d'),
                'heure_admission': f"{np.random.randint(0, 24):02d}:{np.random.randint(0, 60):02d}",
                'date_sortie': date_sortie.strftime('%Y-%m-%d'),
                'heure_sortie': f"{np.random.randint(0, 24):02d}:{np.random.randint(0, 60):02d}",
                'sexe': sexe,
                'age': age,
                'service': service,
                'type_admission': type_admission,
                'motif_admission': motif,
                'gravite': gravite,
                'duree_sejour': duree,
                'cout_sejour': cout,
                'mode_arrivee': mode,
                'a_pris_lit': a_pris_lit,
                'type_lit': type_lit,
                'nb_jours_lit': duree if a_pris_lit == 'oui' else 0,
                'saison': saison,
                'evenement_special': evenement,
                'a_eu_examen': 'oui' if nb_exam > 0 else 'non',
                'nb_examens': nb_exam,
                'types_examens': types_examens,
            }
            
            data.append(row)
        
        # Progression
        if date.day == 1:
            print(f"   📅 Génération {date.strftime('%Y-%m')}... ({len(data)} patients)")
    
    df = pd.DataFrame(data)
    df.to_csv('../../data/admissions_complet.csv', index=False)
    print(f"\n   ✅ {len(df)} lignes générées → data/admissions_complet.csv")
    print(f"   📅 Période: 2020-01-01 → 2025-12-31")
    return df


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("="*70)
    print("🏥 GÉNÉRATION DES DATASETS COMPLETS - PITIÉ-SALPÊTRIÈRE")
    print("="*70)
    print("📅 Période: 2020-01-01 → 2025-12-31 (6 ans)")
    print("🔗 Corrélations: admissions ↔ occupation ↔ personnel ↔ événements")
    print("📈 Évolutions annuelles: +2%/an admissions, +2.5%/an personnel médical")
    print("="*70)
    
    # Générer établissement d'abord (référence pour admissions)
    df_etab = generate_etablissement()
    
    # Générer admissions basé sur établissement
    df_adm = generate_admissions_complet()
    
    print("\n" + "="*70)
    print("📋 RÉSUMÉ")
    print("="*70)
    
    print(f"\n📁 data/etablissement.csv")
    print(f"   Lignes: {len(df_etab)} jours")
    print(f"   Période: 2020-01-01 → 2025-12-31")
    print(f"   Colonnes: {len(df_etab.columns)}")
    
    # Stats évolution
    print(f"\n   📈 Évolution admissions:")
    for year in [2020, 2022, 2025]:
        mean_adm = df_etab[df_etab['annee'] == year]['nb_admissions'].mean()
        print(f"      {year}: {mean_adm:.0f}/jour en moyenne")
    
    print(f"\n   📈 Évolution personnel médecins:")
    for year in [2020, 2022, 2025]:
        mean_pers = df_etab[df_etab['annee'] == year]['personnel_medecins_effectif'].mean()
        print(f"      {year}: {mean_pers:.0f} ETP")
    
    print(f"\n📁 data/admissions_complet.csv")
    print(f"   Lignes: {len(df_adm)} patients")
    print(f"   Période: 2020-01-01 → 2025-12-31")
    print(f"   Colonnes: {len(df_adm.columns)}")
    
    print("\n   📊 Répartition par année:")
    for year in [2020, 2021, 2022, 2023, 2024, 2025]:
        count = len(df_adm[df_adm['date_admission'].str.startswith(str(year))])
        print(f"      {year}: {count:,} patients")
    
    print("\n✅ Génération terminée!")
