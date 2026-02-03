#!/usr/bin/env python3
"""
Parser SAE 2024 - Extraction données Pitié-Salpêtrière
======================================================

Ce script extrait toutes les données de Pitié-Salpêtrière 
des fichiers SAE (Statistique Annuelle des Établissements) 2024.

FINESS Pitié-Salpêtrière: 750100125
FINESS AP-HP (Entité Juridique): 750712184

Source: DREES - Bases Statistiques SAE 2024
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime

DATA_DIR = Path(__file__).parent.parent.parent / "data"
SAE_DIR = DATA_DIR / "Bases CSV"

# FINESS de Pitié-Salpêtrière
FINESS_PITIE = "750100125"

# Description des fichiers SAE
SAE_FILES_DESC = {
    'ID': 'Identification établissement',
    'MCO': 'Médecine-Chirurgie-Obstétrique (activité)',
    'MCOSURV': 'MCO - Surveillance continue',
    'MCOGER': 'MCO - Gériatrie',
    'MCOPED': 'MCO - Pédiatrie',
    'MCOAVC': 'MCO - AVC',
    'SSR': 'Soins de Suite et Réadaptation',
    'SSR2': 'SSR - Détails',
    'SSR_P': 'SSR - Personnel',
    'PSY': 'Psychiatrie',
    'PSY2': 'Psychiatrie - Détails',
    'REA': 'Réanimation - Soins Intensifs - Surveillance Continue',
    'URGENCES': 'Urgences',
    'URGENCES2': 'Urgences - Détails',
    'HAD': 'Hospitalisation à Domicile',
    'HAD_P': 'HAD - Personnel',
    'PERINAT': 'Périnatalité',
    'PERINAT_P': 'Périnatalité - Personnel',
    'BLOCS': 'Blocs opératoires',
    'BLOCS_P': 'Blocs - Personnel',
    'DIALYSE': 'Dialyse',
    'DIALYSE_P': 'Dialyse - Personnel',
    'CHIRCAR': 'Chirurgie Cardiaque',
    'CHIRCAR_P': 'Chirurgie Cardiaque - Personnel',
    'NEUROCHIR': 'Neurochirurgie',
    'NEUROCHIR_P': 'Neurochirurgie - Personnel',
    'BRULES': 'Grands Brûlés',
    'BRULES_P': 'Grands Brûlés - Personnel',
    'CANCERO': 'Cancérologie',
    'IMAGES': 'Imagerie',
    'IMAGES_P': 'Imagerie - Personnel',
    'DOULEUR': 'Douleur chronique',
    'SMURSAMU': 'SMUR/SAMU',
    'USLD': 'Unités de Soins Longue Durée',
    'USLD_P': 'USLD - Personnel',
    'PHARMA': 'Pharmacie',
    'TELEMED': 'Télémédecine',
    'INFOMED': 'Informatique médicale',
    'ORG': 'Organisation',
    'GHT': 'Groupement Hospitalier Territoire',
    'SYGEN': 'Système Gynécologie',
    'ST': 'Stérilisation',
    'STB': 'Stérilisation - Détails',
    'PN': 'Personnel Non médical',
    'HPR': 'Honoraires Praticiens',
    'PCAMEDURG': 'PCA Médecine Urgence',
    'PCAMEDURG_P': 'PCA Médecine Urgence - Personnel',
    'Q20': 'Questionnaire 20',
    'Q21': 'Questionnaire 21',
    'Q22': 'Questionnaire 22',
    'Q23': 'Questionnaire 23',
    'Q24': 'Questionnaire 24',
    'FILTRE': 'Filtres',
}


def parse_sae_file(filepath: Path, finess: str = FINESS_PITIE) -> dict:
    """Parse un fichier SAE et extrait la ligne correspondant au FINESS."""
    
    try:
        # Essayer plusieurs encodages
        df = None
        for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
            try:
                df = pd.read_csv(filepath, sep=';', encoding=encoding, low_memory=False)
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            return {'error': 'Impossible de décoder le fichier'}
        
        # Chercher la colonne FINESS (généralement 'fi')
        finess_col = None
        for col in ['fi', 'FI', 'finess', 'FINESS']:
            if col in df.columns:
                finess_col = col
                break
        
        if finess_col is None:
            return {'error': 'Colonne FINESS non trouvée', 'columns': list(df.columns)[:10]}
        
        # Filtrer sur le FINESS
        df[finess_col] = df[finess_col].astype(str)
        row = df[df[finess_col] == finess]
        
        if row.empty:
            return {'found': False, 'total_rows': len(df)}
        
        # Convertir en dictionnaire
        data = row.iloc[0].to_dict()
        
        # Nettoyer les valeurs NaN
        cleaned_data = {}
        for k, v in data.items():
            if pd.isna(v):
                cleaned_data[k] = None
            elif isinstance(v, (np.integer, np.floating)):
                cleaned_data[k] = float(v) if np.isfinite(v) else None
            else:
                cleaned_data[k] = v
        
        return {
            'found': True,
            'total_rows': len(df),
            'data': cleaned_data
        }
        
    except Exception as e:
        return {'error': str(e)}


def extract_key_metrics(all_data: dict) -> dict:
    """Extrait les métriques clés des données SAE."""
    
    metrics = {
        'identification': {},
        'capacites': {},
        'activite': {},
        'personnel': {},
        'equipements': {},
    }
    
    # === IDENTIFICATION ===
    if 'ID' in all_data and all_data['ID'].get('found'):
        id_data = all_data['ID']['data']
        metrics['identification'] = {
            'finess': id_data.get('fi'),
            'raison_sociale': id_data.get('rs'),
            'groupe': id_data.get('rscom'),
            'categorie': id_data.get('catr'),
            'region': id_data.get('reg'),
            'departement': id_data.get('dep'),
            'commune': id_data.get('NOMCOM'),
            'adresse': f"{id_data.get('NUMVOI', '')} {id_data.get('TYPVOI', '')} {id_data.get('NOMVOI', '')}".strip(),
        }
    
    # === CAPACITÉS MCO ===
    if 'MCO' in all_data and all_data['MCO'].get('found'):
        mco = all_data['MCO']['data']
        metrics['capacites']['mco'] = {
            'lits_medecine': mco.get('LITMED'),
            'lits_chirurgie': mco.get('LITCHIR'),
            'lits_obstetrique': mco.get('LITOBS'),
            'lits_total_hc': mco.get('LITHC'),  # Hospitalisation complète
            'places_hp': mco.get('PLHP'),  # Hospitalisation partielle
            'places_anesthesie': mco.get('PLANES'),
            'journees_medecine': mco.get('JRMED'),
            'journees_chirurgie': mco.get('JRCHIR'),
            'journees_obstetrique': mco.get('JROBS'),
            'sejours_medecine': mco.get('SEJMED'),
            'sejours_chirurgie': mco.get('SEJCHIR'),
            'sejours_obstetrique': mco.get('SEJOBS'),
            'venues_externes': mco.get('VENEXT'),
            'seances': mco.get('SEANCE'),
        }
    
    # === RÉANIMATION ===
    if 'REA' in all_data and all_data['REA'].get('found'):
        rea = all_data['REA']['data']
        metrics['capacites']['reanimation'] = {
            'lits_reanimation': rea.get('LITSREA'),
            'lits_soins_intensifs': rea.get('LITSSI'),
            'lits_surveillance_continue': rea.get('LITSUSC'),
            'journees_reanimation': rea.get('JRREA'),
            'journees_soins_intensifs': rea.get('JRSI'),
            'journees_surveillance_continue': rea.get('JRSUSC'),
            'admissions_reanimation': rea.get('ADMREA'),
        }
    
    # === URGENCES ===
    if 'URGENCES' in all_data and all_data['URGENCES'].get('found'):
        urg = all_data['URGENCES']['data']
        metrics['activite']['urgences'] = {
            'passages_total': urg.get('PASURG'),
            'passages_pediatriques': urg.get('PASUPED'),
            'hospitalisations_uhcd': urg.get('HOSUHCD'),
            'lits_uhcd': urg.get('LITUHCD'),
            'lits_usc_urgences': urg.get('LITUSCURG'),
            'smur_sorties': urg.get('SORSMUR'),
        }
    
    # === PSYCHIATRIE ===
    if 'PSY' in all_data and all_data['PSY'].get('found'):
        psy = all_data['PSY']['data']
        metrics['capacites']['psychiatrie'] = {
            'lits_temps_complet': psy.get('LITTC'),
            'places_temps_partiel': psy.get('PLTP'),
            'journees_hospitalisation': psy.get('JRHOSP'),
            'files_actives': psy.get('FILACT'),
            'actes_ambulatoires': psy.get('ACTAMB'),
        }
    
    # === SSR ===
    if 'SSR' in all_data and all_data['SSR'].get('found'):
        ssr = all_data['SSR']['data']
        metrics['capacites']['ssr'] = {
            'lits_hospitalisation_complete': ssr.get('LITHC'),
            'places_hospitalisation_partielle': ssr.get('PLHP'),
            'journees_hc': ssr.get('JRHC'),
            'venues_hp': ssr.get('VENHP'),
        }
    
    # === BLOCS OPÉRATOIRES ===
    if 'BLOCS' in all_data and all_data['BLOCS'].get('found'):
        blocs = all_data['BLOCS']['data']
        metrics['equipements']['blocs'] = {
            'salles_bloc': blocs.get('SALBLOC'),
            'salles_interventionnelles': blocs.get('SALINT'),
            'salles_endoscopie': blocs.get('SALENDO'),
            'interventions_bloc': blocs.get('INTBLOC'),
            'actes_interventionnels': blocs.get('ACTINT'),
        }
    
    # === IMAGERIE ===
    if 'IMAGES' in all_data and all_data['IMAGES'].get('found'):
        img = all_data['IMAGES']['data']
        metrics['equipements']['imagerie'] = {
            'scanners': img.get('SCAN'),
            'irm': img.get('IRM'),
            'pet_scan': img.get('TEP'),
            'gamma_cameras': img.get('GAMMA'),
            'actes_scanner': img.get('ACTSCAN'),
            'actes_irm': img.get('ACTIRM'),
        }
    
    # === DIALYSE ===
    if 'DIALYSE' in all_data and all_data['DIALYSE'].get('found'):
        dial = all_data['DIALYSE']['data']
        metrics['activite']['dialyse'] = {
            'postes_hemodialyse': dial.get('POSTHD'),
            'seances_hemodialyse': dial.get('SEANHD'),
            'patients_dialyse_peritoneale': dial.get('PATDP'),
        }
    
    # === CANCÉROLOGIE ===
    if 'CANCERO' in all_data and all_data['CANCERO'].get('found'):
        canc = all_data['CANCERO']['data']
        metrics['activite']['cancerologie'] = {
            'sejours_chimio': canc.get('SEJCHIM'),
            'seances_chimio': canc.get('SEACHIM'),
            'sejours_radiotherapie': canc.get('SEJRAD'),
            'seances_radiotherapie': canc.get('SEARAD'),
        }
    
    # === PÉRINATALITÉ ===
    if 'PERINAT' in all_data and all_data['PERINAT'].get('found'):
        peri = all_data['PERINAT']['data']
        metrics['activite']['perinatalite'] = {
            'accouchements': peri.get('ACCOU'),
            'naissances_vivantes': peri.get('NAISVIV'),
            'cesariennes': peri.get('CESAR'),
            'lits_obstetrique': peri.get('LITOBS'),
            'lits_neonatologie': peri.get('LITNEO'),
            'lits_reanimation_neonatale': peri.get('LITREANEO'),
        }
    
    return metrics


def main():
    """Parse tous les fichiers SAE et extrait les données Pitié-Salpêtrière."""
    
    print("="*70)
    print("EXTRACTION DONNÉES SAE 2024 - PITIÉ-SALPÊTRIÈRE")
    print(f"FINESS: {FINESS_PITIE}")
    print("="*70)
    
    if not SAE_DIR.exists():
        print(f"❌ Dossier non trouvé: {SAE_DIR}")
        return
    
    # Lister tous les fichiers
    csv_files = list(SAE_DIR.glob("*_2024r.csv"))
    print(f"\n📁 {len(csv_files)} fichiers SAE trouvés")
    
    # Parser chaque fichier
    all_data = {}
    found_count = 0
    
    for filepath in sorted(csv_files):
        # Extraire le nom du module
        module = filepath.stem.replace('_2024r', '')
        desc = SAE_FILES_DESC.get(module, module)
        
        result = parse_sae_file(filepath)
        all_data[module] = result
        
        if result.get('found'):
            found_count += 1
            print(f"  ✓ {module:15} - {desc}")
        elif 'error' in result:
            print(f"  ⚠ {module:15} - Erreur: {result['error'][:50]}")
        else:
            print(f"  · {module:15} - Non présent (données pour {result.get('total_rows', '?')} établissements)")
    
    print(f"\n📊 Pitié-Salpêtrière présent dans {found_count}/{len(csv_files)} fichiers")
    
    # Extraire les métriques clés
    metrics = extract_key_metrics(all_data)
    
    # Afficher résumé
    print("\n" + "="*70)
    print("RÉSUMÉ DONNÉES PITIÉ-SALPÊTRIÈRE (SAE 2024)")
    print("="*70)
    
    if metrics['identification']:
        print(f"\n🏥 {metrics['identification'].get('raison_sociale', 'N/A')}")
        print(f"   Groupe: {metrics['identification'].get('groupe', 'N/A')}")
        print(f"   Adresse: {metrics['identification'].get('adresse', 'N/A')}")
    
    if metrics['capacites'].get('mco'):
        mco = metrics['capacites']['mco']
        print(f"\n📊 CAPACITÉS MCO:")
        print(f"   Lits Médecine:    {mco.get('lits_medecine', 'N/A')}")
        print(f"   Lits Chirurgie:   {mco.get('lits_chirurgie', 'N/A')}")
        print(f"   Lits Obstétrique: {mco.get('lits_obstetrique', 'N/A')}")
        print(f"   Total HC:         {mco.get('lits_total_hc', 'N/A')}")
        print(f"   Places HP:        {mco.get('places_hp', 'N/A')}")
    
    if metrics['capacites'].get('reanimation'):
        rea = metrics['capacites']['reanimation']
        print(f"\n🚨 RÉANIMATION:")
        print(f"   Lits Réa:         {rea.get('lits_reanimation', 'N/A')}")
        print(f"   Lits SI:          {rea.get('lits_soins_intensifs', 'N/A')}")
        print(f"   Lits USC:         {rea.get('lits_surveillance_continue', 'N/A')}")
    
    if metrics['activite'].get('urgences'):
        urg = metrics['activite']['urgences']
        print(f"\n🚑 URGENCES:")
        print(f"   Passages/an:      {urg.get('passages_total', 'N/A')}")
        print(f"   Passages pédia:   {urg.get('passages_pediatriques', 'N/A')}")
        print(f"   Lits UHCD:        {urg.get('lits_uhcd', 'N/A')}")
    
    if metrics['capacites'].get('psychiatrie'):
        psy = metrics['capacites']['psychiatrie']
        print(f"\n🧠 PSYCHIATRIE:")
        print(f"   Lits TC:          {psy.get('lits_temps_complet', 'N/A')}")
        print(f"   Places TP:        {psy.get('places_temps_partiel', 'N/A')}")
    
    if metrics['equipements'].get('blocs'):
        blocs = metrics['equipements']['blocs']
        print(f"\n🔧 BLOCS OPÉRATOIRES:")
        print(f"   Salles bloc:      {blocs.get('salles_bloc', 'N/A')}")
        print(f"   Interventions:    {blocs.get('interventions_bloc', 'N/A')}")
    
    if metrics['equipements'].get('imagerie'):
        img = metrics['equipements']['imagerie']
        print(f"\n📷 IMAGERIE:")
        print(f"   Scanners:         {img.get('scanners', 'N/A')}")
        print(f"   IRM:              {img.get('irm', 'N/A')}")
        print(f"   PET-Scan:         {img.get('pet_scan', 'N/A')}")
    
    # Sauvegarder les données brutes
    output_raw = DATA_DIR / "sae_pitie_raw.json"
    with open(output_raw, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n✅ Données brutes: {output_raw}")
    
    # Sauvegarder les métriques
    output_metrics = DATA_DIR / "sae_pitie_metrics.json"
    with open(output_metrics, 'w', encoding='utf-8') as f:
        json.dump({
            'source': 'DREES - SAE 2024',
            'finess': FINESS_PITIE,
            'extracted_at': datetime.now().isoformat(),
            'metrics': metrics
        }, f, indent=2, ensure_ascii=False, default=str)
    print(f"✅ Métriques: {output_metrics}")
    
    return all_data, metrics


if __name__ == "__main__":
    main()
