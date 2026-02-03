"""
Génération du dataset hospitalier fictif pour la Pitié-Salpêtrière
====================================================================

Ce script génère un dataset réaliste de 100k+ admissions sur 2 ans avec:
- Saisonnalité basée sur les VRAIES données DREES Paris (2017-2023)
- Variations hebdomadaires réelles (lundi +9%, dimanche -8%)
- Variations horaires (pics 8h-12h et 18h-22h)
- Événements exceptionnels calibrés sur données réelles
- Coefficients épidémiques grippe (Réseau Sentinelles, 1984-2026)

Sources:
- DREES: Séries longues passages aux urgences 2017-2023
- Pitié-Salpêtrière: ~122 000 passages/an (données 2015)
- Santé Publique France: COVID-19 passages urgences (2020-2026)
- Réseau Sentinelles: Incidence grippe hebdomadaire (1984-2026)
- SI-VIC: Hospitalisations COVID Paris
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os
import json

# Configuration de la seed pour reproductibilité
np.random.seed(42)
random.seed(42)

# =============================================================================
# CONSTANTES ET CONFIGURATION
# =============================================================================

# Période de génération
START_DATE = datetime(2024, 1, 1)
END_DATE = datetime(2025, 12, 31)
TOTAL_DAYS = (END_DATE - START_DATE).days + 1

# Services hospitaliers avec leur poids d'admission
SERVICES = {
    'Urgences': {'weight': 0.45, 'avg_stay': 1.5, 'personnel_ratio': 3},
    'Cardiologie': {'weight': 0.15, 'avg_stay': 5, 'personnel_ratio': 2},
    'Neurologie': {'weight': 0.12, 'avg_stay': 7, 'personnel_ratio': 2.5},
    'Maladies Infectieuses': {'weight': 0.10, 'avg_stay': 6, 'personnel_ratio': 2},
    'Pédiatrie': {'weight': 0.10, 'avg_stay': 3, 'personnel_ratio': 2.5},
    'Réanimation': {'weight': 0.08, 'avg_stay': 10, 'personnel_ratio': 4},
}

# Motifs d'admission par service
MOTIFS = {
    'Urgences': ['Traumatisme', 'Douleur thoracique', 'Douleur abdominale', 'Malaise', 
                 'Chute', 'Accident', 'Intoxication', 'Brûlure', 'Plaie', 'Fièvre'],
    'Cardiologie': ['Infarctus', 'Insuffisance cardiaque', 'Arythmie', 'Angine de poitrine',
                    'Hypertension', 'Péricardite', 'Embolie pulmonaire'],
    'Neurologie': ['AVC', 'Épilepsie', 'Migraine sévère', 'Sclérose en plaques',
                   'Parkinson', 'Méningite', 'Traumatisme crânien'],
    'Maladies Infectieuses': ['Grippe sévère', 'COVID-19', 'Pneumonie', 'Sepsis',
                              'Infection urinaire', 'Gastro-entérite', 'Tuberculose'],
    'Pédiatrie': ['Bronchiolite', 'Gastro-entérite', 'Otite', 'Fièvre',
                  'Asthme', 'Fracture', 'Déshydratation'],
    'Réanimation': ['Choc septique', 'Détresse respiratoire', 'Coma', 'Polytraumatisme',
                    'Arrêt cardiaque', 'Insuffisance multi-organes'],
}

# Types d'admission
TYPES_ADMISSION = ['Urgence', 'Programmée', 'Transfert']
TYPES_WEIGHTS = [0.65, 0.25, 0.10]

# Niveaux de gravité
GRAVITES = ['Légère', 'Modérée', 'Grave', 'Critique']
GRAVITE_WEIGHTS = [0.35, 0.40, 0.20, 0.05]

# Coûts moyens par gravité (en euros)
COUTS_GRAVITE = {
    'Légère': (500, 1500),
    'Modérée': (1500, 4000),
    'Grave': (4000, 10000),
    'Critique': (10000, 30000),
}

# =============================================================================
# COEFFICIENTS RÉELS (DREES Paris 2017-2023)
# =============================================================================

# Coefficients mensuels - extraits des données réelles DREES Paris
MONTHLY_COEFFICIENTS = {
    1: 1.0186,   # Janvier: +1.9%
    2: 1.0250,   # Février: +2.5%
    3: 1.0027,   # Mars: +0.3%
    4: 0.9346,   # Avril: -6.5%
    5: 0.9640,   # Mai: -3.6%
    6: 1.0421,   # Juin: +4.2%
    7: 0.9658,   # Juillet: -3.4%
    8: 0.8694,   # Août: -13.1% (vacances)
    9: 1.0345,   # Septembre: +3.4%
    10: 1.0707,  # Octobre: +7.1% (pic automnal)
    11: 1.0386,  # Novembre: +3.9%
    12: 1.0380,  # Décembre: +3.8%
}

# Coefficients jour de semaine - données réelles DREES
WEEKDAY_COEFFICIENTS = {
    0: 1.0934,  # Lundi: +9.3% (accumulation weekend)
    1: 1.0013,  # Mardi: +0.1%
    2: 0.9946,  # Mercredi: -0.5%
    3: 1.0040,  # Jeudi: +0.4%
    4: 1.0182,  # Vendredi: +1.8%
    5: 0.9694,  # Samedi: -3.1%
    6: 0.9194,  # Dimanche: -8.1%
}

# Coefficients hebdomadaires grippe - données réelles Réseau Sentinelles (1984-2026)
# Les valeurs > 1 indiquent une activité supérieure à la moyenne annuelle
GRIPPE_WEEKLY_COEFFICIENTS = {
    1: 2.178,   # Début janvier: pic post-fêtes
    2: 2.123,
    3: 2.482,   # Mi-janvier: montée épidémique
    4: 3.103,
    5: 3.594,   # Fin janvier: pic épidémique
    6: 3.682,   # Février S1: pic max historique
    7: 3.173,
    8: 2.514,   # Fin février: décrue
    9: 1.890,
    10: 1.549,
    11: 1.325,
    12: 1.170,
    13: 1.017,  # Avril: fin de saison
    14: 0.828,
    15: 0.545,
    16: 0.389,
    17: 0.272,  # Mai-Juin: activité minimale
    18: 0.188,
    19: 0.161,
    20: 0.142,
    21: 0.122,
    22: 0.122,
    23: 0.136,
    24: 0.126,  # Été: creux
    25: 0.126,
    26: 0.114,
    27: 0.111,
    28: 0.097,
    29: 0.094,
    30: 0.083,  # Août: minimum
    31: 0.105,
    32: 0.079,
    33: 0.088,
    34: 0.106,
    35: 0.110,
    36: 0.134,  # Septembre: reprise
    37: 0.215,
    38: 0.324,
    39: 0.405,
    40: 0.427,  # Octobre: montée automnale
    41: 0.450,
    42: 0.460,
    43: 0.446,
    44: 0.440,
    45: 0.522,
    46: 0.623,  # Novembre: accélération
    47: 1.031,
    48: 1.640,
    49: 2.371,  # Décembre: forte hausse
    50: 2.831,
    51: 3.056,  # Pic fêtes de Noël
    52: 2.383,
}

# Données COVID réelles Paris (SPF)
COVID_STATS = {
    'peak_factor': 171.28,  # Facteur multiplicateur au pic (trop extrême, on modère)
    'realistic_peak_factor': 2.0,  # Facteur réaliste pour simulation
    'paris_max_rate': 47082.68,  # Taux max observé Paris
    'paris_mean_rate': 1786.04,  # Taux moyen Paris
}

# Données hospitalisations Paris (SI-VIC)
HOSPITALISATION_STATS = {
    'mean_daily': 44.02,  # Moyenne hospitalisations/jour Paris (COVID)
    'max_daily': 404,  # Pic journalier Paris
    'rea_ratio': 0.228,  # 22.8% en réanimation
    'mortality_ratio': 0.1334,  # 13.3% mortalité hospitalière
}

# =============================================================================
# FONCTIONS DE SAISONNALITÉ ET VARIATIONS
# =============================================================================

def get_seasonal_factor(date: datetime) -> float:
    """Calcule le facteur saisonnier basé sur les données réelles DREES."""
    return MONTHLY_COEFFICIENTS[date.month]


def get_weekly_factor(date: datetime) -> float:
    """Calcule le facteur hebdomadaire basé sur les données réelles DREES."""
    return WEEKDAY_COEFFICIENTS[date.weekday()]


def get_grippe_factor(date: datetime) -> float:
    """
    Calcule le facteur d'activité grippale basé sur les données Sentinelles.
    
    Le coefficient est normalisé pour que:
    - 1.0 = activité moyenne annuelle
    - >1.0 = saison grippale active
    - <1.0 = inter-saison
    
    Impact sur les services concernés (Urgences, Maladies Infectieuses, Pédiatrie):
    - On applique un facteur modéré car la grippe n'impacte pas tous les passages
    - Environ 10-15% des passages sont liés aux syndromes grippaux en pic
    """
    week_num = date.isocalendar()[1]
    week_num = min(week_num, 52)  # Cap à 52 pour éviter les erreurs
    
    base_coeff = GRIPPE_WEEKLY_COEFFICIENTS.get(week_num, 1.0)
    
    # Normaliser pour avoir un impact raisonnable sur les admissions totales
    # La grippe impacte ~10-15% des passages au pic, donc on module
    if base_coeff > 1.0:
        # En période épidémique, ajouter un bonus proportionnel
        # Coefficient max ~3.7 -> impact +15% sur les admissions totales
        impact = 1.0 + (base_coeff - 1.0) * 0.06  # 6% de l'excès
    else:
        # En inter-saison, légère réduction
        impact = 1.0 - (1.0 - base_coeff) * 0.03  # 3% de la réduction
    
    return impact


def get_hourly_distribution() -> list:
    """Retourne une distribution horaire réaliste des admissions."""
    # Pics: 8h-12h et 18h-22h, creux: 2h-6h
    hourly_weights = [
        0.02, 0.01, 0.01, 0.01, 0.01, 0.02,  # 0h-5h
        0.03, 0.04, 0.06, 0.07, 0.08, 0.07,  # 6h-11h
        0.05, 0.04, 0.04, 0.05, 0.05, 0.06,  # 12h-17h
        0.07, 0.08, 0.07, 0.05, 0.04, 0.03,  # 18h-23h
    ]
    # Normaliser pour que la somme fasse 1
    total = sum(hourly_weights)
    return [w / total for w in hourly_weights]


def get_exceptional_events() -> list:
    """
    Définit les événements exceptionnels sur la période.
    
    Facteurs calibrés sur les données RÉELLES:
    - Grippe sévère: +30-45% (données SPF/Sentinelles - coefficient hebdo ~3.5x)
    - COVID/épidémie majeure: +50-80% (données SPF Paris - pics observés)
    - Canicule: +20-30% (données Santé Publique France)
    - Bronchiolite: +25-35% pédiatrie (données Sentinelles)
    - Accident massif: +50-100% sur 1 jour
    
    Données de calibration:
    - Hospitalisation COVID Paris: moy 44/j, pic 404/j (facteur 9x au pic)
    - Taux réa: 22.8%, mortalité hospitalière: 13.3%
    - Grippe: coefficient hebdo max 3.68 (semaine 6)
    """
    events = []
    
    # =================================================================
    # HIVER 2024: Grippe + Bronchiolite (basé sur données Sentinelles)
    # =================================================================
    
    # Pic grippal janvier 2024 (semaines 3-6 = pic historique)
    # Coefficient Sentinelles semaine 5-6: ~3.6x -> facteur +40%
    events.append({
        'start': datetime(2024, 1, 22),  # Semaine 4
        'end': datetime(2024, 2, 11),    # Semaine 6
        'type': 'epidemie',
        'name': 'Pic grippal hiver 2024',
        'factor': 1.42,  # Basé sur coeff Sentinelles 3.6 -> impact ~42%
        'services_affected': ['Urgences', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation']
    })
    
    # =================================================================
    # PRINTEMPS 2024: Fin de vague + gastro
    # =================================================================
    
    # Gastro-entérite mars 2024 (classique post-hiver)
    events.append({
        'start': datetime(2024, 3, 10),
        'end': datetime(2024, 3, 20),
        'type': 'epidemie',
        'name': 'Gastro-entérite mars',
        'factor': 1.18,
        'services_affected': ['Urgences', 'Pédiatrie', 'Maladies Infectieuses']
    })
    
    # =================================================================
    # ÉTÉ 2024: Canicule (basé sur données Météo France/SPF)
    # =================================================================
    
    # Canicule juillet 2024 (7 jours)
    # Impact cardiaque et neurologique marqué
    events.append({
        'start': datetime(2024, 7, 18),
        'end': datetime(2024, 7, 25),
        'type': 'canicule',
        'name': 'Canicule juillet 2024',
        'factor': 1.28,  # +28% basé sur données SPF canicules
        'services_affected': ['Urgences', 'Cardiologie', 'Neurologie']
    })
    
    # =================================================================
    # AUTOMNE 2024: Reprise épidémique
    # =================================================================
    
    # Bronchiolite octobre-novembre (pic pédiatrique)
    # Très marqué chez les <2 ans
    events.append({
        'start': datetime(2024, 10, 28),
        'end': datetime(2024, 11, 17),
        'type': 'epidemie',
        'name': 'Bronchiolite automne 2024',
        'factor': 1.32,
        'services_affected': ['Urgences', 'Pédiatrie']
    })
    
    # =================================================================
    # HIVER 2024-2025: Épidémie complexe (Grippe + COVID + Bronchiolite)
    # =================================================================
    
    # Triple épidémie fêtes de fin d'année
    # Basé sur données SPF: convergence grippe/COVID/bronchiolite
    events.append({
        'start': datetime(2024, 12, 16),
        'end': datetime(2025, 1, 12),
        'type': 'epidemie',
        'name': 'Triple épidémie hiver',
        'factor': 1.55,  # Impact cumulé grippe+COVID+bronchiolite
        'services_affected': ['Urgences', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation']
    })
    
    # =================================================================
    # 2025: ÉVÉNEMENTS DIVERS
    # =================================================================
    
    # Gastro-entérite février 2025
    events.append({
        'start': datetime(2025, 2, 8),
        'end': datetime(2025, 2, 18),
        'type': 'epidemie',
        'name': 'Gastro-entérite hiver',
        'factor': 1.22,
        'services_affected': ['Urgences', 'Pédiatrie', 'Maladies Infectieuses']
    })
    
    # Accident massif type JO (1 jour)
    # Simulation d'un incident majeur
    events.append({
        'start': datetime(2025, 3, 15),
        'end': datetime(2025, 3, 15),
        'type': 'accident_massif',
        'name': 'Incident majeur',
        'factor': 1.85,  # +85% sur la journée
        'services_affected': ['Urgences', 'Réanimation']
    })
    
    # Grève personnel hospitalier (3 jours)
    # Réduit la capacité effective
    events.append({
        'start': datetime(2025, 4, 22),
        'end': datetime(2025, 4, 24),
        'type': 'greve',
        'name': 'Mouvement social',
        'factor': 0.72,  # -28% d'activité
        'services_affected': list(SERVICES.keys())
    })
    
    # Canicule août 2025 - plus longue
    events.append({
        'start': datetime(2025, 8, 2),
        'end': datetime(2025, 8, 14),
        'type': 'canicule',
        'name': 'Canicule prolongée août',
        'factor': 1.35,  # Plus intense car plus longue
        'services_affected': ['Urgences', 'Cardiologie', 'Neurologie', 'Réanimation']
    })
    
    # Pic automnal grippe 2025 (début précoce)
    events.append({
        'start': datetime(2025, 11, 10),
        'end': datetime(2025, 11, 30),
        'type': 'epidemie',
        'name': 'Grippe précoce automne',
        'factor': 1.38,
        'services_affected': ['Urgences', 'Maladies Infectieuses', 'Pédiatrie']
    })
    
    # Pic fêtes 2025 (grippe + virus respiratoires)
    events.append({
        'start': datetime(2025, 12, 15),
        'end': datetime(2025, 12, 31),
        'type': 'epidemie',
        'name': 'Épidémie fêtes 2025',
        'factor': 1.48,
        'services_affected': ['Urgences', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation']
    })
    
    return events


def is_in_event(date: datetime, events: list) -> tuple:
    """Vérifie si une date est dans un événement exceptionnel."""
    for event in events:
        if event['start'] <= date <= event['end']:
            return True, event
    return False, None


# =============================================================================
# GÉNÉRATION DES DONNÉES
# =============================================================================

def generate_patient_id(index: int) -> str:
    """Génère un identifiant patient anonymisé."""
    return f"PAT_{index:06d}"


def generate_age(service: str) -> int:
    """Génère un âge réaliste selon le service."""
    if service == 'Pédiatrie':
        return np.random.randint(0, 18)
    elif service == 'Réanimation':
        # Plus souvent des personnes âgées
        return int(np.random.triangular(30, 65, 95))
    elif service == 'Cardiologie':
        return int(np.random.triangular(40, 60, 90))
    elif service == 'Neurologie':
        return int(np.random.triangular(35, 55, 85))
    else:
        # Distribution générale
        return int(np.random.triangular(18, 45, 95))


def generate_duree_sejour(service: str, gravite: str) -> int:
    """Génère une durée de séjour réaliste."""
    base_stay = SERVICES[service]['avg_stay']
    
    # Ajustement selon gravité
    gravite_factor = {
        'Légère': 0.5,
        'Modérée': 1.0,
        'Grave': 1.5,
        'Critique': 2.5,
    }
    
    mean_stay = base_stay * gravite_factor[gravite]
    # Distribution log-normale pour des séjours réalistes
    stay = max(1, int(np.random.lognormal(np.log(mean_stay), 0.5)))
    return min(stay, 90)  # Cap à 90 jours


def generate_cout(gravite: str, duree: int) -> float:
    """Génère un coût de séjour réaliste."""
    min_cost, max_cost = COUTS_GRAVITE[gravite]
    base_cost = np.random.uniform(min_cost, max_cost)
    # Coût augmente avec la durée
    return round(base_cost * (1 + 0.1 * duree), 2)


def generate_daily_admissions(date: datetime, events: list) -> int:
    """
    Calcule le nombre d'admissions pour une journée donnée.
    
    Intègre:
    - Saisonnalité mensuelle (DREES)
    - Variations jour de semaine (DREES)  
    - Pattern épidémique grippe (Sentinelles)
    - Événements exceptionnels
    """
    # Base: ~334 admissions/jour (données réelles Pitié-Salpêtrière ~122k/an)
    base_admissions = 334
    
    # Appliquer les facteurs réels DREES
    seasonal = get_seasonal_factor(date)
    weekly = get_weekly_factor(date)
    
    # Facteur grippe saisonnier (données Sentinelles)
    grippe = get_grippe_factor(date)
    
    # Événement exceptionnel ?
    in_event, event = is_in_event(date, events)
    event_factor = event['factor'] if in_event else 1.0
    
    # Calcul final avec variation aléatoire
    # En période grippale, on n'additionne pas grippe + event car certains events sont déjà des épidémies
    if in_event and event.get('type') == 'epidemie':
        # L'événement épidémique remplace le facteur grippe normal
        expected = base_admissions * seasonal * weekly * event_factor
    else:
        # Combiner saisonnalité normale et grippe de fond
        expected = base_admissions * seasonal * weekly * grippe * event_factor
    
    # Variation journalière basée sur l'écart-type réel observé (~10%)
    variation = np.random.normal(1.0, 0.10)
    actual = max(100, int(expected * variation))
    
    return actual


def generate_dataset():
    """Génère le dataset complet."""
    print("Génération du dataset hospitalier...")
    print(f"Période: {START_DATE.date()} à {END_DATE.date()}")
    
    events = get_exceptional_events()
    hourly_weights = get_hourly_distribution()
    
    records = []
    patient_counter = 1
    
    current_date = START_DATE
    while current_date <= END_DATE:
        # Nombre d'admissions pour ce jour
        n_admissions = generate_daily_admissions(current_date, events)
        
        # Vérifier si on est dans un événement
        in_event, event = is_in_event(current_date, events)
        
        for _ in range(n_admissions):
            # Sélection du service
            if in_event and event['type'] != 'greve':
                # Pendant un événement, privilégier les services affectés
                affected_services = event['services_affected']
                service_weights = []
                for s in SERVICES.keys():
                    if s in affected_services:
                        service_weights.append(SERVICES[s]['weight'] * 2)
                    else:
                        service_weights.append(SERVICES[s]['weight'] * 0.5)
                total = sum(service_weights)
                service_weights = [w/total for w in service_weights]
                service = np.random.choice(list(SERVICES.keys()), p=service_weights)
            else:
                services_list = list(SERVICES.keys())
                weights = [SERVICES[s]['weight'] for s in services_list]
                service = np.random.choice(services_list, p=weights)
            
            # Heure d'admission
            hour = np.random.choice(24, p=hourly_weights)
            minute = np.random.randint(0, 60)
            date_admission = current_date.replace(hour=hour, minute=minute)
            
            # Autres attributs
            gravite = np.random.choice(GRAVITES, p=GRAVITE_WEIGHTS)
            duree_sejour = generate_duree_sejour(service, gravite)
            date_sortie = date_admission + timedelta(days=duree_sejour)
            
            age = generate_age(service)
            sexe = np.random.choice(['M', 'F'], p=[0.48, 0.52])
            type_admission = np.random.choice(TYPES_ADMISSION, p=TYPES_WEIGHTS)
            motif = np.random.choice(MOTIFS[service])
            
            personnel_requis = max(1, int(np.random.poisson(SERVICES[service]['personnel_ratio'])))
            cout = generate_cout(gravite, duree_sejour)
            
            record = {
                'id_patient': generate_patient_id(patient_counter),
                'date_admission': date_admission.strftime('%Y-%m-%d %H:%M'),
                'date_sortie': date_sortie.strftime('%Y-%m-%d %H:%M'),
                'age': age,
                'sexe': sexe,
                'service': service,
                'gravite': gravite,
                'duree_sejour': duree_sejour,
                'motif_admission': motif,
                'type_admission': type_admission,
                'personnel_requis': personnel_requis,
                'cout_sejour': cout,
            }
            
            records.append(record)
            patient_counter += 1
        
        current_date += timedelta(days=1)
        
        # Progress
        if current_date.day == 1:
            print(f"  Traitement de {current_date.strftime('%B %Y')}...")
    
    df = pd.DataFrame(records)
    print(f"\nDataset généré avec succès!")
    print(f"  - Nombre total d'admissions: {len(df):,}")
    print(f"  - Période couverte: {df['date_admission'].min()} à {df['date_admission'].max()}")
    
    return df


def generate_resources_dataset(admissions_df: pd.DataFrame) -> pd.DataFrame:
    """Génère un dataset de ressources basé sur les admissions."""
    print("\nGénération du dataset des ressources...")
    
    # Convertir en datetime
    admissions_df['date_admission_dt'] = pd.to_datetime(admissions_df['date_admission'])
    admissions_df['date_sortie_dt'] = pd.to_datetime(admissions_df['date_sortie'])
    
    resources = []
    
    # Capacité par service (nombre de lits)
    CAPACITE_LITS = {
        'Urgences': 150,
        'Cardiologie': 200,
        'Neurologie': 180,
        'Maladies Infectieuses': 120,
        'Pédiatrie': 100,
        'Réanimation': 80,
    }
    
    # Personnel disponible par service
    PERSONNEL_BASE = {
        'Urgences': 80,
        'Cardiologie': 50,
        'Neurologie': 45,
        'Maladies Infectieuses': 40,
        'Pédiatrie': 35,
        'Réanimation': 60,
    }
    
    # Générer pour chaque jour et service
    current_date = START_DATE
    while current_date <= END_DATE:
        for service in SERVICES.keys():
            # Compter les patients présents ce jour
            mask = (
                (admissions_df['service'] == service) &
                (admissions_df['date_admission_dt'].dt.date <= current_date.date()) &
                (admissions_df['date_sortie_dt'].dt.date >= current_date.date())
            )
            patients_present = mask.sum()
            
            lits_total = CAPACITE_LITS[service]
            lits_occupes = min(patients_present, lits_total)
            
            # Personnel (variation aléatoire)
            personnel_total = PERSONNEL_BASE[service]
            variation = np.random.uniform(0.85, 1.0)  # 85-100% de disponibilité
            personnel_dispo = int(personnel_total * variation)
            
            # Personnel occupé basé sur les patients
            personnel_occupe = min(
                int(patients_present * SERVICES[service]['personnel_ratio'] / 2),
                personnel_dispo
            )
            
            resources.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'service': service,
                'lits_total': lits_total,
                'lits_occupes': lits_occupes,
                'lits_disponibles': lits_total - lits_occupes,
                'taux_occupation': round(lits_occupes / lits_total * 100, 1),
                'personnel_total': personnel_total,
                'personnel_disponible': personnel_dispo,
                'personnel_occupe': personnel_occupe,
            })
        
        current_date += timedelta(days=1)
    
    df_resources = pd.DataFrame(resources)
    print(f"Dataset ressources généré: {len(df_resources):,} enregistrements")
    
    return df_resources


def generate_daily_stats(admissions_df: pd.DataFrame) -> pd.DataFrame:
    """Génère des statistiques journalières agrégées."""
    print("\nGénération des statistiques journalières...")
    
    admissions_df['date'] = pd.to_datetime(admissions_df['date_admission']).dt.date
    
    daily_stats = admissions_df.groupby('date').agg({
        'id_patient': 'count',
        'duree_sejour': 'mean',
        'cout_sejour': 'sum',
        'personnel_requis': 'sum',
        'age': 'mean',
    }).reset_index()
    
    daily_stats.columns = ['date', 'admissions', 'duree_moyenne', 'cout_total', 
                           'personnel_total', 'age_moyen']
    
    # Ajouter des colonnes temporelles
    daily_stats['date'] = pd.to_datetime(daily_stats['date'])
    daily_stats['jour_semaine'] = daily_stats['date'].dt.dayofweek
    daily_stats['mois'] = daily_stats['date'].dt.month
    daily_stats['annee'] = daily_stats['date'].dt.year
    daily_stats['semaine'] = daily_stats['date'].dt.isocalendar().week
    
    # Arrondir
    daily_stats['duree_moyenne'] = daily_stats['duree_moyenne'].round(2)
    daily_stats['cout_total'] = daily_stats['cout_total'].round(2)
    daily_stats['age_moyen'] = daily_stats['age_moyen'].round(1)
    
    print(f"Statistiques journalières: {len(daily_stats)} jours")
    
    return daily_stats


def main():
    """Point d'entrée principal."""
    # Créer le dossier data s'il n'existe pas
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # Générer le dataset principal
    df_admissions = generate_dataset()
    
    # Sauvegarder en CSV
    admissions_path = os.path.join(data_dir, 'admissions.csv')
    df_admissions.to_csv(admissions_path, index=False, encoding='utf-8')
    print(f"\nFichier sauvegardé: {admissions_path}")
    
    # NOTE: Les ressources et statistiques sont générées par generate_stats.py
    # car ce script est optimisé pour ces calculs
    
    # Afficher quelques statistiques
    print("\n" + "="*60)
    print("RÉSUMÉ DU DATASET")
    print("="*60)
    print(f"Total admissions: {len(df_admissions):,}")
    print(f"Moyenne journalière: {len(df_admissions)/TOTAL_DAYS:.1f}")
    print(f"\nRépartition par service:")
    print(df_admissions['service'].value_counts().to_string())
    print(f"\nRépartition par gravité:")
    print(df_admissions['gravite'].value_counts().to_string())
    print(f"\nCoût total des séjours: {df_admissions['cout_sejour'].sum():,.2f} €")
    print(f"Coût moyen par séjour: {df_admissions['cout_sejour'].mean():,.2f} €")
    
    print("\n" + "="*60)
    print("PROCHAINE ÉTAPE: Exécutez generate_stats.py pour générer")
    print("les statistiques et données de ressources.")
    print("="*60)


if __name__ == '__main__':
    main()
