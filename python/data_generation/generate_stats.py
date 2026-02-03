"""
Génération des statistiques agrégées à partir du dataset d'admissions.
"""

import pandas as pd
import numpy as np
import os

def main():
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    
    print("Chargement du dataset admissions...")
    df = pd.read_csv(os.path.join(data_dir, 'admissions.csv'))
    df['date_admission'] = pd.to_datetime(df['date_admission'])
    df['date'] = df['date_admission'].dt.date
    
    print(f"Total admissions: {len(df):,}")
    
    # Statistiques journalières globales
    print("\nGénération des statistiques journalières...")
    daily_stats = df.groupby('date').agg({
        'id_patient': 'count',
        'duree_sejour': 'mean',
        'cout_sejour': ['sum', 'mean'],
        'personnel_requis': 'sum',
        'age': 'mean',
    }).reset_index()
    
    daily_stats.columns = ['date', 'admissions', 'duree_moyenne', 'cout_total', 
                           'cout_moyen', 'personnel_total', 'age_moyen']
    
    daily_stats['date'] = pd.to_datetime(daily_stats['date'])
    daily_stats['jour_semaine'] = daily_stats['date'].dt.dayofweek
    daily_stats['mois'] = daily_stats['date'].dt.month
    daily_stats['annee'] = daily_stats['date'].dt.year
    daily_stats['semaine'] = daily_stats['date'].dt.isocalendar().week
    daily_stats['jour_nom'] = daily_stats['date'].dt.day_name()
    
    # Arrondir
    for col in ['duree_moyenne', 'cout_total', 'cout_moyen', 'age_moyen']:
        daily_stats[col] = daily_stats[col].round(2)
    
    daily_stats.to_csv(os.path.join(data_dir, 'daily_stats.csv'), index=False)
    print(f"Sauvegardé: daily_stats.csv ({len(daily_stats)} jours)")
    
    # Statistiques par service et par jour
    print("\nGénération des statistiques par service...")
    service_stats = df.groupby(['date', 'service']).agg({
        'id_patient': 'count',
        'duree_sejour': 'mean',
        'cout_sejour': 'sum',
        'gravite': lambda x: (x == 'Critique').sum() + (x == 'Grave').sum(),
    }).reset_index()
    
    service_stats.columns = ['date', 'service', 'admissions', 'duree_moyenne', 
                             'cout_total', 'cas_graves']
    
    service_stats.to_csv(os.path.join(data_dir, 'service_daily_stats.csv'), index=False)
    print(f"Sauvegardé: service_daily_stats.csv ({len(service_stats)} enregistrements)")
    
    # Statistiques mensuelles
    print("\nGénération des statistiques mensuelles...")
    df['mois'] = df['date_admission'].dt.to_period('M')
    monthly_stats = df.groupby('mois').agg({
        'id_patient': 'count',
        'duree_sejour': 'mean',
        'cout_sejour': 'sum',
        'age': 'mean',
    }).reset_index()
    
    monthly_stats.columns = ['mois', 'admissions', 'duree_moyenne', 'cout_total', 'age_moyen']
    monthly_stats['mois'] = monthly_stats['mois'].astype(str)
    
    monthly_stats.to_csv(os.path.join(data_dir, 'monthly_stats.csv'), index=False)
    print(f"Sauvegardé: monthly_stats.csv ({len(monthly_stats)} mois)")
    
    # Générer les données de ressources simplifiées
    print("\nGénération des données de ressources...")
    
    CAPACITE_LITS = {
        'Urgences': 150, 'Cardiologie': 200, 'Neurologie': 180,
        'Maladies Infectieuses': 120, 'Pédiatrie': 100, 'Réanimation': 80,
    }
    
    PERSONNEL_BASE = {
        'Urgences': 80, 'Cardiologie': 50, 'Neurologie': 45,
        'Maladies Infectieuses': 40, 'Pédiatrie': 35, 'Réanimation': 60,
    }
    
    # Calculer le taux d'occupation moyen par service pour normaliser
    avg_admissions_by_service = service_stats.groupby('service')['admissions'].mean().to_dict()
    
    resources_list = []
    for _, row in service_stats.iterrows():
        service = row['service']
        lits_total = CAPACITE_LITS.get(service, 100)
        personnel_total = PERSONNEL_BASE.get(service, 40)
        
        # Taux d'occupation basé sur les admissions relatives à la moyenne
        avg_admissions = avg_admissions_by_service.get(service, 50)
        ratio = row['admissions'] / avg_admissions if avg_admissions > 0 else 1
        
        # Base occupation entre 50-75%, modulé par le ratio d'admissions
        base_occupation = 0.6 + np.random.uniform(-0.1, 0.1)
        occupation_rate = min(0.95, max(0.3, base_occupation * ratio))
        
        lits_occupes = int(lits_total * occupation_rate)
        
        personnel_dispo = int(personnel_total * np.random.uniform(0.85, 1.0))
        personnel_occupe = min(int(lits_occupes * 0.3), personnel_dispo)
        
        resources_list.append({
            'date': row['date'],
            'service': service,
            'lits_total': lits_total,
            'lits_occupes': lits_occupes,
            'lits_disponibles': lits_total - lits_occupes,
            'taux_occupation': round(lits_occupes / lits_total * 100, 1),
            'personnel_total': personnel_total,
            'personnel_disponible': personnel_dispo,
            'personnel_occupe': personnel_occupe,
        })
    
    resources_df = pd.DataFrame(resources_list)
    resources_df.to_csv(os.path.join(data_dir, 'resources.csv'), index=False)
    print(f"Sauvegardé: resources.csv ({len(resources_df)} enregistrements)")
    
    # Afficher un résumé
    print("\n" + "="*60)
    print("RÉSUMÉ")
    print("="*60)
    print(f"Période: {df['date'].min()} à {df['date'].max()}")
    print(f"Total admissions: {len(df):,}")
    print(f"Moyenne journalière: {daily_stats['admissions'].mean():.1f}")
    print(f"\nRépartition par service:")
    print(df['service'].value_counts().to_string())
    print(f"\nRépartition par gravité:")
    print(df['gravite'].value_counts().to_string())
    

if __name__ == '__main__':
    main()
