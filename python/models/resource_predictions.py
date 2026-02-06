"""
Prédiction des Besoins en Ressources Hospitalières
===================================================

Ce module prédit les besoins en lits, personnel et équipements
basés sur les prédictions d'admissions.

Formules basées sur les données historiques Hospi-Diag et ratios nationaux.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, r2_score


# ============================================================================
# RATIOS HOSPITALIERS (basés sur données réelles Pitié-Salpêtrière)
# ============================================================================

# Ratio lits occupés par jour basé sur admissions journalières
# Formule: lits_occupés = admissions × ratio_type × durée_moyenne_séjour / période_moyenne
# Ces ratios sont calibrés pour que les besoins correspondent aux capacités réelles
RATIOS_LITS = {
    'medecine': {
        'ratio_base': 1.10,  # Facteur de conversion admissions -> lits occupés
        'taux_occupation_cible': 0.85,
    },
    'chirurgie': {
        'ratio_base': 0.55,
        'taux_occupation_cible': 0.80,
    },
    'reanimation': {
        'ratio_base': 0.18,
        'taux_occupation_cible': 0.85,
    },
    'soins_intensifs': {
        'ratio_base': 0.12,
        'taux_occupation_cible': 0.82,
    },
    'urgences': {
        'ratio_base': 0.10,  # Passages courts, peu de lits
        'taux_occupation_cible': 0.95,
    },
    'obstetrique': {
        'ratio_base': 0.08,
        'taux_occupation_cible': 0.70,
    },
}

# Ratio personnel par lit occupé (calibré sur Pitié-Salpêtrière)
# Ces ratios représentent l'ETP nécessaire par lit occupé par service
RATIOS_PERSONNEL = {
    'medecins': {
        'par_lit_medecine': 0.08,
        'par_lit_chirurgie': 0.12,
        'par_lit_reanimation': 0.35,
        'par_lit_soins_intensifs': 0.25,
        'par_lit_urgences': 0.15,
    },
    'infirmiers': {
        'par_lit_medecine': 0.45,
        'par_lit_chirurgie': 0.50,
        'par_lit_reanimation': 1.80,
        'par_lit_soins_intensifs': 1.20,
        'par_lit_urgences': 0.80,
    },
    'aides_soignants': {
        'par_lit_medecine': 0.35,
        'par_lit_chirurgie': 0.30,
        'par_lit_reanimation': 0.80,
        'par_lit_soins_intensifs': 0.60,
        'par_lit_urgences': 0.45,
    },
}

# Ratio examens par admission selon gravité
RATIOS_EQUIPEMENTS = {
    'scanner': {
        'ratio_admissions': 0.35,  # 35% des admissions ont un scanner
        'duree_exam_min': 20,
        'plages_jour': 40,  # Créneaux disponibles par scanner/jour
    },
    'irm': {
        'ratio_admissions': 0.18,
        'duree_exam_min': 45,
        'plages_jour': 20,
    },
    'radio': {
        'ratio_admissions': 0.55,
        'duree_exam_min': 10,
        'plages_jour': 60,
    },
    'echo': {
        'ratio_admissions': 0.25,
        'duree_exam_min': 20,
        'plages_jour': 35,
    },
    'bloc_operatoire': {
        'ratio_admissions': 0.15,  # 15% des admissions passent au bloc
        'duree_exam_min': 120,
        'plages_jour': 6,  # Interventions par salle/jour
    },
}

# Capacités actuelles Pitié-Salpêtrière (Hospi-Diag 2023)
CAPACITES_ACTUELLES = {
    'lits': {
        'medecine': 742,
        'chirurgie': 385,
        'reanimation': 104,
        'soins_intensifs': 70,
        'urgences': 50,
        'obstetrique': 48,
    },
    'equipements': {
        'scanner': 7,
        'irm': 6,
        'bloc_operatoire': 53,
    },
    'personnel': {
        'medecins': 479,
        'infirmiers': 3200,  # Estimé depuis ETP soins
        'aides_soignants': 1500,
    }
}


def calculate_bed_needs(predicted_admissions: float, 
                        event_type: str = 'normal',
                        saison: str = 'normal') -> dict:
    """
    Calcule les besoins en lits par type basés sur les admissions prévues.
    
    Args:
        predicted_admissions: Nombre d'admissions prévues
        event_type: Type d'événement (normal, covid, grippe, canicule)
        saison: Saison (hiver, printemps, ete, automne)
    
    Returns:
        Dict avec besoins par type de lit
    """
    # Ajustements selon événement
    event_adjustments = {
        'normal': {'reanimation': 1.0, 'medecine': 1.0},
        'covid': {'reanimation': 1.8, 'medecine': 1.3},
        'grippe': {'reanimation': 1.2, 'medecine': 1.25},
        'canicule': {'reanimation': 1.15, 'medecine': 1.1},
        'bronchiolite': {'reanimation': 1.1, 'medecine': 1.15},
    }
    
    # Ajustements saisonniers
    season_adjustments = {
        'hiver': 1.15,
        'printemps': 1.0,
        'ete': 0.85,
        'automne': 1.05,
    }
    
    adj = event_adjustments.get(event_type, event_adjustments['normal'])
    season_factor = season_adjustments.get(saison, 1.0)
    
    needs = {}
    total_beds_needed = 0
    
    for lit_type, ratios in RATIOS_LITS.items():
        # Lits nécessaires basé sur ratio calibré
        beds_base = predicted_admissions * ratios['ratio_base']
        
        # Ajustement événement (réa et médecine surtout)
        if lit_type in adj:
            beds_base *= adj[lit_type]
        
        # Ajustement saison
        beds_base *= season_factor
        
        # Variation aléatoire légère (+/- 5%)
        beds_needed = beds_base * (0.95 + np.random.uniform(0, 0.10))
        
        # Capacité actuelle
        capacity = CAPACITES_ACTUELLES['lits'].get(lit_type, 100)
        
        # Taux d'utilisation
        taux_util = min(110, beds_needed / capacity * 100)
        
        needs[lit_type] = {
            'lits_necessaires': round(beds_needed),
            'capacite_actuelle': capacity,
            'taux_utilisation_prevu': round(taux_util, 1),
            'surplus_deficit': round(capacity - beds_needed),
            'alerte': taux_util > 85,
            'critique': taux_util > 95,
        }
        
        total_beds_needed += beds_needed
    
    total_capacity = sum(CAPACITES_ACTUELLES['lits'].values())
    needs['total'] = {
        'lits_necessaires': round(total_beds_needed),
        'capacite_totale': total_capacity,
        'taux_global': round(total_beds_needed / total_capacity * 100, 1),
    }
    
    return needs


def calculate_staff_needs(bed_needs: dict) -> dict:
    """
    Calcule les besoins en personnel basés sur les besoins en lits.
    """
    needs = {}
    
    for staff_type, ratios in RATIOS_PERSONNEL.items():
        total_needed = 0
        breakdown = {}
        
        for lit_type in ['medecine', 'chirurgie', 'reanimation', 'soins_intensifs', 'urgences']:
            if lit_type in bed_needs:
                ratio_key = f'par_lit_{lit_type}'
                if ratio_key in ratios:
                    beds = bed_needs[lit_type]['lits_necessaires']
                    staff_for_type = beds * ratios[ratio_key]
                    breakdown[lit_type] = round(staff_for_type)
                    total_needed += staff_for_type
        
        # Ajouter marge pour absences/congés (+15%)
        total_with_margin = total_needed * 1.15
        
        capacity = CAPACITES_ACTUELLES['personnel'].get(staff_type, 1000)
        
        needs[staff_type] = {
            'effectif_necessaire': round(total_needed),
            'effectif_avec_marge': round(total_with_margin),
            'effectif_disponible': capacity,
            'taux_mobilisation': round(total_with_margin / capacity * 100, 1),
            'deficit': round(max(0, total_with_margin - capacity)),
            'breakdown': breakdown,
            'alerte': total_with_margin > capacity * 0.90,
            'critique': total_with_margin > capacity,
        }
    
    return needs


def calculate_equipment_needs(predicted_admissions: float, event_type: str = 'normal') -> dict:
    """
    Calcule les besoins en équipements médicaux.
    """
    # Ajustements par événement (plus d'examens en période de crise)
    event_factors = {
        'normal': 1.0,
        'covid': 1.4,
        'grippe': 1.2,
        'canicule': 1.1,
    }
    
    factor = event_factors.get(event_type, 1.0)
    
    needs = {}
    
    for equip_type, ratios in RATIOS_EQUIPEMENTS.items():
        # Nombre d'examens prévus
        exams_needed = predicted_admissions * ratios['ratio_admissions'] * factor
        
        # Capacité par machine
        if equip_type in CAPACITES_ACTUELLES['equipements']:
            nb_machines = CAPACITES_ACTUELLES['equipements'][equip_type]
            daily_capacity = nb_machines * ratios['plages_jour']
            
            needs[equip_type] = {
                'examens_prevus': round(exams_needed),
                'capacite_jour': daily_capacity,
                'nb_machines': nb_machines,
                'taux_utilisation': round(exams_needed / daily_capacity * 100, 1),
                'alerte': exams_needed > daily_capacity * 0.85,
                'critique': exams_needed > daily_capacity * 0.95,
            }
        else:
            needs[equip_type] = {
                'examens_prevus': round(exams_needed),
                'capacite_jour': None,
                'taux_utilisation': None,
            }
    
    return needs


def generate_resource_predictions(predictions_data: list, 
                                  include_weekly: bool = True) -> dict:
    """
    Génère les prédictions de ressources complètes pour une liste de prédictions d'admissions.
    
    Args:
        predictions_data: Liste de dicts avec 'date' et 'predicted_admissions'
        include_weekly: Inclure les agrégations hebdomadaires
    
    Returns:
        Dict avec prédictions détaillées
    """
    daily_predictions = []
    
    for pred in predictions_data:
        date = pred['date']
        admissions = pred.get('predicted_admissions') or pred.get('ensemble_prediction', 450)
        
        # Déterminer saison
        if isinstance(date, str):
            month = int(date.split('-')[1])
        else:
            month = date.month
        
        if month in [12, 1, 2]:
            saison = 'hiver'
        elif month in [6, 7, 8]:
            saison = 'ete'
        else:
            saison = 'normal'
        
        # Calculer les besoins
        bed_needs = calculate_bed_needs(admissions, saison=saison)
        staff_needs = calculate_staff_needs(bed_needs)
        equipment_needs = calculate_equipment_needs(admissions)
        
        daily_predictions.append({
            'date': date if isinstance(date, str) else date.strftime('%Y-%m-%d'),
            'admissions_prevues': round(admissions),
            'lits': bed_needs,
            'personnel': staff_needs,
            'equipements': equipment_needs,
            'alertes': {
                'lits': any(v.get('alerte', False) for k, v in bed_needs.items() if k != 'total'),
                'personnel': any(v.get('alerte', False) for v in staff_needs.values()),
                'equipements': any(v.get('alerte', False) for v in equipment_needs.values()),
            },
            'niveau_risque': _calculate_risk_level(bed_needs, staff_needs, equipment_needs),
        })
    
    # Agrégations
    result = {
        'generated_at': datetime.now().isoformat(),
        'horizon_jours': len(daily_predictions),
        'daily': daily_predictions,
    }
    
    # Résumé global
    if daily_predictions:
        result['summary'] = {
            'admissions_moyenne': round(np.mean([d['admissions_prevues'] for d in daily_predictions])),
            'admissions_max': max(d['admissions_prevues'] for d in daily_predictions),
            'jours_alerte_lits': sum(1 for d in daily_predictions if d['alertes']['lits']),
            'jours_alerte_personnel': sum(1 for d in daily_predictions if d['alertes']['personnel']),
            'jours_alerte_equipements': sum(1 for d in daily_predictions if d['alertes']['equipements']),
            'risque_moyen': round(np.mean([d['niveau_risque'] for d in daily_predictions]), 1),
        }
    
    # Agrégation hebdomadaire
    if include_weekly and len(daily_predictions) >= 7:
        weekly = []
        for i in range(0, len(daily_predictions), 7):
            week_data = daily_predictions[i:i+7]
            if week_data:
                weekly.append({
                    'semaine': f"Semaine {i//7 + 1}",
                    'debut': week_data[0]['date'],
                    'fin': week_data[-1]['date'],
                    'admissions_total': sum(d['admissions_prevues'] for d in week_data),
                    'admissions_moyenne': round(np.mean([d['admissions_prevues'] for d in week_data])),
                    'jours_alerte': sum(1 for d in week_data if any(d['alertes'].values())),
                    'risque_max': max(d['niveau_risque'] for d in week_data),
                })
        result['weekly'] = weekly
    
    return result


def _calculate_risk_level(bed_needs: dict, staff_needs: dict, equipment_needs: dict) -> int:
    """Calcule un niveau de risque global de 1 à 5."""
    score = 0
    
    # Risque lits
    for lit_type, data in bed_needs.items():
        if lit_type == 'total':
            continue
        if data.get('critique'):
            score += 2
        elif data.get('alerte'):
            score += 1
    
    # Risque personnel
    for staff_type, data in staff_needs.items():
        if data.get('critique'):
            score += 2
        elif data.get('alerte'):
            score += 1
    
    # Risque équipements
    for equip_type, data in equipment_needs.items():
        if data.get('critique'):
            score += 1.5
        elif data.get('alerte'):
            score += 0.5
    
    # Convertir en niveau 1-5
    if score >= 10:
        return 5
    elif score >= 7:
        return 4
    elif score >= 4:
        return 3
    elif score >= 2:
        return 2
    else:
        return 1


def generate_recommendations(resource_predictions: dict) -> list:
    """Génère des recommandations basées sur les prédictions de ressources."""
    recommendations = []
    
    summary = resource_predictions.get('summary', {})
    daily = resource_predictions.get('daily', [])
    
    if not daily:
        return recommendations
    
    # Analyser les tendances
    admissions_trend = [d['admissions_prevues'] for d in daily]
    
    # Recommandations lits
    if summary.get('jours_alerte_lits', 0) > 3:
        worst_days = sorted(daily, key=lambda x: x['lits']['total']['lits_necessaires'], reverse=True)[:3]
        recommendations.append({
            'type': 'lits',
            'priorite': 'haute',
            'titre': 'Tension sur les lits prévue',
            'description': f"{summary['jours_alerte_lits']} jours avec risque de suroccupation des lits sur les {len(daily)} prochains jours.",
            'action': 'Préparer des lits supplémentaires ou prévoir des transferts vers d\'autres établissements.',
            'dates_critiques': [d['date'] for d in worst_days],
        })
    
    # Recommandations personnel
    if summary.get('jours_alerte_personnel', 0) > 2:
        recommendations.append({
            'type': 'personnel',
            'priorite': 'haute',
            'titre': 'Renfort personnel nécessaire',
            'description': f"Personnel insuffisant prévu sur {summary['jours_alerte_personnel']} jours.",
            'action': 'Mobiliser le pool de remplacement, rappeler les congés si nécessaire.',
        })
    
    # Recommandations équipements
    if summary.get('jours_alerte_equipements', 0) > 2:
        recommendations.append({
            'type': 'equipements',
            'priorite': 'moyenne',
            'titre': 'Saturation équipements prévue',
            'description': f"Capacité d'imagerie/bloc insuffisante sur {summary['jours_alerte_equipements']} jours.",
            'action': 'Étendre les plages horaires ou prioriser les examens urgents.',
        })
    
    # Recommandation tendance
    if len(admissions_trend) >= 7:
        trend_start = np.mean(admissions_trend[:7])
        trend_end = np.mean(admissions_trend[-7:]) if len(admissions_trend) >= 14 else admissions_trend[-1]
        
        if trend_end > trend_start * 1.15:
            recommendations.append({
                'type': 'tendance',
                'priorite': 'moyenne',
                'titre': 'Tendance à la hausse détectée',
                'description': f"Les admissions prévues augmentent de {((trend_end/trend_start)-1)*100:.0f}% sur la période.",
                'action': 'Anticiper une montée en charge progressive.',
            })
    
    # Recommandation risque global
    if summary.get('risque_moyen', 0) >= 3:
        recommendations.append({
            'type': 'global',
            'priorite': 'critique',
            'titre': 'Niveau de risque élevé',
            'description': f"Risque moyen de {summary['risque_moyen']}/5 sur la période.",
            'action': 'Activer le plan de gestion de crise. Réunion de coordination recommandée.',
        })
    
    # Trier par priorité
    priority_order = {'critique': 0, 'haute': 1, 'moyenne': 2, 'basse': 3}
    recommendations.sort(key=lambda x: priority_order.get(x['priorite'], 99))
    
    return recommendations


def main():
    """Point d'entrée principal - Génère les prédictions de ressources."""
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    
    # Charger les prédictions d'admissions existantes
    ensemble_path = os.path.join(data_dir, 'predictions_ensemble.json')
    
    if os.path.exists(ensemble_path):
        with open(ensemble_path, 'r') as f:
            predictions_data = json.load(f)
        
        predictions_list = predictions_data.get('predictions', [])
        print(f"📊 Chargement de {len(predictions_list)} prédictions d'admissions...")
    else:
        print("⚠️ Fichier predictions_ensemble.json non trouvé. Génération de données test...")
        predictions_list = [
            {'date': (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d'),
             'predicted_admissions': 450 + np.random.randint(-50, 100)}
            for i in range(30)
        ]
    
    # Générer les prédictions de ressources
    print("\n🏥 Génération des prédictions de ressources...")
    resource_preds = generate_resource_predictions(predictions_list)
    
    # Générer les recommandations
    print("💡 Génération des recommandations...")
    recommendations = generate_recommendations(resource_preds)
    resource_preds['recommendations'] = recommendations
    
    # Sauvegarder
    output_path = os.path.join(data_dir, 'predictions_resources.json')
    with open(output_path, 'w') as f:
        json.dump(resource_preds, f, indent=2)
    
    print(f"\n✅ Prédictions sauvegardées: {output_path}")
    
    # Afficher le résumé
    print("\n" + "="*60)
    print("📋 RÉSUMÉ DES PRÉDICTIONS DE RESSOURCES")
    print("="*60)
    
    summary = resource_preds.get('summary', {})
    print(f"\n📊 Période: {resource_preds['horizon_jours']} jours")
    print(f"   Admissions moyenne: {summary.get('admissions_moyenne', 'N/A')}/jour")
    print(f"   Admissions max: {summary.get('admissions_max', 'N/A')}")
    
    print(f"\n⚠️ Alertes prévues:")
    print(f"   Lits: {summary.get('jours_alerte_lits', 0)} jours")
    print(f"   Personnel: {summary.get('jours_alerte_personnel', 0)} jours")
    print(f"   Équipements: {summary.get('jours_alerte_equipements', 0)} jours")
    
    print(f"\n🎯 Niveau de risque moyen: {summary.get('risque_moyen', 'N/A')}/5")
    
    if recommendations:
        print(f"\n💡 {len(recommendations)} recommandations générées:")
        for rec in recommendations[:3]:
            print(f"   [{rec['priorite'].upper()}] {rec['titre']}")
    
    # Exemple détaillé pour J+1
    if resource_preds['daily']:
        j1 = resource_preds['daily'][0]
        print(f"\n📅 Détail J+1 ({j1['date']}):")
        print(f"   Admissions: {j1['admissions_prevues']}")
        print(f"   Lits médecine: {j1['lits']['medecine']['lits_necessaires']} / {j1['lits']['medecine']['capacite_actuelle']}")
        print(f"   Lits réa: {j1['lits']['reanimation']['lits_necessaires']} / {j1['lits']['reanimation']['capacite_actuelle']}")
        print(f"   Médecins: {j1['personnel']['medecins']['effectif_avec_marge']} / {j1['personnel']['medecins']['effectif_disponible']}")
        print(f"   Scanner: {j1['equipements']['scanner']['examens_prevus']} examens ({j1['equipements']['scanner']['taux_utilisation']}%)")


if __name__ == '__main__':
    main()
