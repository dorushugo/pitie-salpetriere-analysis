#!/usr/bin/env python3
"""
Analyse et intégration de TOUS les datasets réels
==================================================

Ce script analyse et compile les informations de tous nos datasets
pour enrichir notre modèle de simulation hospitalière.

Datasets analysés:
1. Lits soins critiques (réa, SI, SC) - DREES
2. Évolution lits France (2013-2024) - DREES
3. Hospitalisations COVID Paris - SPF
4. Passages urgences COVID - SurSaud
5. Incidence grippe France - Sentinelles (42 ans)
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime

DATA_DIR = Path(__file__).parent.parent.parent / "data"
EXTERNAL_DIR = DATA_DIR / "external"
OUTPUT_FILE = DATA_DIR / "datasets_analysis.json"


def analyze_lits_soins_critiques():
    """Analyse des lits de soins critiques (réa, SI, SC)."""
    print("\n📊 Analyse: Lits de soins critiques")
    
    try:
        df = pd.read_csv(EXTERNAL_DIR / "lits_soins_critiques.csv", sep=";")
        
        # Filtrer France entière et dernière année disponible
        df_france = df[df['id_geo'] == '00_FR'].copy()
        
        # Dernière année par type d'unité
        latest_year = df_france['annee'].max()
        df_latest = df_france[df_france['annee'] == latest_year]
        
        # Agréger par type d'unité et statut
        summary = {}
        for _, row in df_latest.iterrows():
            key = f"{row['uni']}_{row['statut_etab']}"
            summary[key] = row['nb_lit']
        
        # Calcul totaux
        total_public = df_latest[df_latest['statut_etab'].str.contains('Public', na=False)]['nb_lit'].sum()
        total_prive = df_latest[df_latest['statut_etab'].str.contains('Privé', na=False)]['nb_lit'].sum()
        
        result = {
            "source": "DREES - SAE",
            "derniere_annee": int(latest_year),
            "total_lits_critiques_public": int(total_public),
            "total_lits_critiques_prive": int(total_prive),
            "total_france": int(total_public + total_prive),
            "detail": {k: int(v) if pd.notna(v) else 0 for k, v in summary.items()}
        }
        
        print(f"  Dernière année: {latest_year}")
        print(f"  Lits critiques France: {total_public + total_prive:,}")
        print(f"    - Public: {total_public:,}")
        print(f"    - Privé: {total_prive:,}")
        
        return result
    except Exception as e:
        print(f"  ⚠️ Erreur: {e}")
        return None


def analyze_evolution_lits():
    """Analyse de l'évolution des lits en France (2013-2024)."""
    print("\n📊 Analyse: Évolution des lits France (2013-2024)")
    
    try:
        df = pd.read_csv(EXTERNAL_DIR / "evolution_lits_places.csv", sep=";")
        df = df.sort_values('Année')
        
        # Renommer colonnes
        df.columns = ['annee', 'lits_complets', 'places_partiels']
        
        # Calculer tendances
        first_year = df.iloc[0]
        last_year = df.iloc[-1]
        
        evol_lits = ((last_year['lits_complets'] - first_year['lits_complets']) / first_year['lits_complets']) * 100
        evol_places = ((last_year['places_partiels'] - first_year['places_partiels']) / first_year['places_partiels']) * 100
        
        result = {
            "source": "DREES",
            "periode": f"{int(first_year['annee'])}-{int(last_year['annee'])}",
            "evolution_lits_complets_pct": round(evol_lits, 1),
            "evolution_places_partiels_pct": round(evol_places, 1),
            "lits_2024": int(last_year['lits_complets']),
            "places_2024": int(last_year['places_partiels']),
            "tendance_annuelle_lits": round((last_year['lits_complets'] - first_year['lits_complets']) / (last_year['annee'] - first_year['annee']), 0),
            "serie_complete": df.to_dict('records')
        }
        
        print(f"  Période: {result['periode']}")
        print(f"  Évolution lits complets: {evol_lits:+.1f}%")
        print(f"  Évolution places partiels: {evol_places:+.1f}%")
        print(f"  Tendance annuelle: {result['tendance_annuelle_lits']:,.0f} lits/an")
        
        return result
    except Exception as e:
        print(f"  ⚠️ Erreur: {e}")
        return None


def analyze_covid_hospitalisations():
    """Analyse des hospitalisations COVID (focus Paris)."""
    print("\n📊 Analyse: Hospitalisations COVID")
    
    try:
        df = pd.read_csv(EXTERNAL_DIR / "hospitalisations_covid.csv", sep=";")
        df['jour'] = pd.to_datetime(df['jour'])
        
        # Paris (75)
        df_paris = df[df['dep'] == '75'].copy()
        
        # Statistiques générales
        stats = {
            "source": "Santé Publique France",
            "periode": f"{df_paris['jour'].min().date()} à {df_paris['jour'].max().date()}",
            "nb_jours": len(df_paris),
            "paris_75": {
                "total_hospitalisations": int(df_paris['incid_hosp'].sum()),
                "total_reanimations": int(df_paris['incid_rea'].sum()),
                "total_deces": int(df_paris['incid_dc'].sum()),
                "moyenne_hosp_jour": round(df_paris['incid_hosp'].mean(), 1),
                "max_hosp_jour": int(df_paris['incid_hosp'].max()),
                "date_pic": str(df_paris.loc[df_paris['incid_hosp'].idxmax(), 'jour'].date())
            }
        }
        
        # France entière
        df_france = df.groupby('jour').agg({
            'incid_hosp': 'sum',
            'incid_rea': 'sum',
            'incid_dc': 'sum'
        }).reset_index()
        
        stats["france"] = {
            "total_hospitalisations": int(df_france['incid_hosp'].sum()),
            "moyenne_hosp_jour": round(df_france['incid_hosp'].mean(), 1),
            "max_hosp_jour": int(df_france['incid_hosp'].max()),
            "date_pic": str(df_france.loc[df_france['incid_hosp'].idxmax(), 'jour'].date())
        }
        
        print(f"  Période: {stats['periode']}")
        print(f"  Paris - Total hospitalisations: {stats['paris_75']['total_hospitalisations']:,}")
        print(f"  Paris - Pic journalier: {stats['paris_75']['max_hosp_jour']} ({stats['paris_75']['date_pic']})")
        print(f"  France - Pic journalier: {stats['france']['max_hosp_jour']} ({stats['france']['date_pic']})")
        
        return stats
    except Exception as e:
        print(f"  ⚠️ Erreur: {e}")
        return None


def analyze_urgences_covid():
    """Analyse des passages aux urgences COVID."""
    print("\n📊 Analyse: Passages urgences COVID (SurSaud)")
    
    try:
        df = pd.read_csv(EXTERNAL_DIR / "sursaud_covid_quotidien.csv", sep=";")
        
        # Vérifier les colonnes disponibles
        cols = df.columns.tolist()
        date_col = [c for c in cols if 'date' in c.lower() or 'jour' in c.lower()][0]
        
        df[date_col] = pd.to_datetime(df[date_col])
        
        # Chercher les colonnes pertinentes
        passages_col = [c for c in cols if 'nbre_pass' in c.lower() or 'pass_' in c.lower()]
        
        if passages_col:
            stats = {
                "source": "Santé Publique France - SurSaud",
                "colonnes_disponibles": cols[:10],  # Aperçu des colonnes
                "periode": f"{df[date_col].min().date()} à {df[date_col].max().date()}",
                "nb_lignes": len(df)
            }
        else:
            stats = {
                "source": "Santé Publique France - SurSaud",
                "colonnes": cols,
                "nb_lignes": len(df)
            }
        
        print(f"  Lignes: {len(df):,}")
        print(f"  Colonnes: {', '.join(cols[:5])}...")
        
        return stats
    except Exception as e:
        print(f"  ⚠️ Erreur: {e}")
        return None


def analyze_grippe_sentinelles():
    """Analyse de l'incidence grippe Sentinelles (42 ans)."""
    print("\n📊 Analyse: Incidence grippe Sentinelles")
    
    try:
        df = pd.read_csv(EXTERNAL_DIR / "grippe_incidence_france.csv", sep=",")
        
        # Convertir en numérique
        for col in ['inc', 'inc100', 'inc100_low', 'inc100_up']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Statistiques par semaine de l'année
        df['week'] = df['week'].astype(int) % 100  # Extraire semaine
        
        # Moyenne historique par semaine
        weekly_avg = df.groupby('week')['inc100'].mean().to_dict()
        
        # Identifier semaines à risque (>200 cas/100k)
        high_risk_weeks = [w for w, v in weekly_avg.items() if v > 200]
        
        stats = {
            "source": "Réseau Sentinelles - INSERM",
            "annees_couvertes": f"{int(df['week'].min() // 100) if df['week'].max() > 100 else 'Multiple'} années",
            "nb_semaines_donnees": len(df),
            "incidence_moyenne": round(df['inc100'].mean(), 1),
            "incidence_max": round(df['inc100'].max(), 1),
            "semaines_pic_grippe": sorted(high_risk_weeks) if high_risk_weeks else [1, 2, 3, 4, 5, 6, 7, 8],
            "coefficients_hebdo": {int(k): round(v / df['inc100'].mean(), 2) for k, v in weekly_avg.items() if pd.notna(v)}
        }
        
        print(f"  Données: {len(df):,} semaines")
        print(f"  Incidence moyenne: {stats['incidence_moyenne']:.1f} cas/100k/semaine")
        print(f"  Incidence max: {stats['incidence_max']:.1f} cas/100k/semaine")
        print(f"  Semaines à risque: {len(high_risk_weeks)} semaines >200 cas/100k")
        
        return stats
    except Exception as e:
        print(f"  ⚠️ Erreur: {e}")
        return None


def generate_pitie_estimates():
    """Estimation des données spécifiques à Pitié-Salpêtrière."""
    print("\n🏥 Estimation: Pitié-Salpêtrière (AP-HP)")
    
    # Données connues sur Pitié-Salpêtrière (sources: AP-HP, SAE)
    pitie = {
        "nom": "Hôpital Universitaire Pitié-Salpêtrière",
        "groupe": "AP-HP",
        "departement": "75 - Paris",
        "caracteristiques": {
            "type": "CHU - Centre Hospitalier Universitaire",
            "lits_estimes": 1800,  # Estimation basée sur données AP-HP
            "places_ambulatoire": 200,
            "services_urgences": True,
            "soins_critiques": True,
            "maternite": True
        },
        "activite_estimee": {
            "passages_urgences_jour": 250,  # Estimation moyenne CHU Paris
            "admissions_jour": 150,
            "consultations_externes_jour": 3000,
            "interventions_chirurgicales_jour": 80
        },
        "personnel_estime": {
            "medecins": 1500,
            "infirmiers": 3000,
            "aides_soignants": 2000,
            "administratifs": 1500,
            "total": 8000
        },
        "source": "Estimations basées sur données AP-HP et moyennes CHU"
    }
    
    print(f"  Lits estimés: ~{pitie['caracteristiques']['lits_estimes']}")
    print(f"  Passages urgences/jour: ~{pitie['activite_estimee']['passages_urgences_jour']}")
    print(f"  Personnel total: ~{pitie['personnel_estime']['total']}")
    
    return pitie


def main():
    """Analyse complète de tous les datasets."""
    print("=" * 60)
    print("ANALYSE COMPLÈTE DES DATASETS RÉELS")
    print("=" * 60)
    
    analysis = {
        "generated_at": datetime.now().isoformat(),
        "datasets": {}
    }
    
    # 1. Lits soins critiques
    result = analyze_lits_soins_critiques()
    if result:
        analysis["datasets"]["lits_soins_critiques"] = result
    
    # 2. Évolution lits France
    result = analyze_evolution_lits()
    if result:
        analysis["datasets"]["evolution_lits_france"] = result
    
    # 3. COVID hospitalisations
    result = analyze_covid_hospitalisations()
    if result:
        analysis["datasets"]["covid_hospitalisations"] = result
    
    # 4. Urgences COVID
    result = analyze_urgences_covid()
    if result:
        analysis["datasets"]["urgences_covid_sursaud"] = result
    
    # 5. Grippe Sentinelles
    result = analyze_grippe_sentinelles()
    if result:
        analysis["datasets"]["grippe_sentinelles"] = result
    
    # 6. Estimations Pitié-Salpêtrière
    analysis["pitie_salpetriere"] = generate_pitie_estimates()
    
    # Résumé
    print("\n" + "=" * 60)
    print("RÉSUMÉ DES DONNÉES DISPONIBLES")
    print("=" * 60)
    
    summary = {
        "nb_datasets": len(analysis["datasets"]),
        "sources": ["DREES", "Santé Publique France", "Réseau Sentinelles", "SurSaud"],
        "couverture_temporelle": "2013-2024",
        "granularite": ["France", "Département", "Jour", "Semaine"],
        "indicateurs_cles": [
            "Lits hospitaliers (évolution)",
            "Lits soins critiques",
            "Hospitalisations COVID",
            "Passages urgences",
            "Incidence grippe",
        ]
    }
    analysis["summary"] = summary
    
    for k, v in summary.items():
        print(f"  {k}: {v}")
    
    # Sauvegarder
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n✅ Analyse sauvegardée: {OUTPUT_FILE}")
    
    return analysis


if __name__ == "__main__":
    main()
