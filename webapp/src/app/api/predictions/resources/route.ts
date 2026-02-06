import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    
    const dataDir = path.join(process.cwd(), '..', 'data');
    const filePath = path.join(dataDir, 'predictions_resources.json');
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Limiter les jours si demandé
      if (days < data.horizon_jours && data.daily) {
        data.daily = data.daily.slice(0, days);
        data.horizon_jours = days;
        
        // Recalculer le résumé
        if (data.daily.length > 0) {
          const admissions = data.daily.map((d: any) => d.admissions_prevues);
          data.summary = {
            admissions_moyenne: Math.round(admissions.reduce((a: number, b: number) => a + b, 0) / admissions.length),
            admissions_max: Math.max(...admissions),
            jours_alerte_lits: data.daily.filter((d: any) => d.alertes?.lits).length,
            jours_alerte_personnel: data.daily.filter((d: any) => d.alertes?.personnel).length,
            jours_alerte_equipements: data.daily.filter((d: any) => d.alertes?.equipements).length,
            risque_moyen: Math.round(data.daily.reduce((sum: number, d: any) => sum + d.niveau_risque, 0) / data.daily.length * 10) / 10,
          };
        }
      }
      
      return NextResponse.json(data);
    } catch (error) {
      // Si le fichier n'existe pas, générer des données par défaut
      console.log('Fichier predictions_resources.json non trouvé, génération de données par défaut');
      
      const defaultData = generateDefaultResourcePredictions(days);
      return NextResponse.json(defaultData);
    }
  } catch (error) {
    console.error('Error fetching resource predictions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des prédictions de ressources' },
      { status: 500 }
    );
  }
}

function generateDefaultResourcePredictions(days: number) {
  const daily = [];
  const baseDate = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i + 1);
    
    const admissions = 450 + Math.floor(Math.random() * 50) - 25;
    const isWinter = date.getMonth() === 11 || date.getMonth() <= 1;
    const seasonFactor = isWinter ? 1.15 : 1.0;
    
    daily.push({
      date: date.toISOString().split('T')[0],
      admissions_prevues: Math.round(admissions * seasonFactor),
      lits: {
        medecine: {
          lits_necessaires: Math.round(admissions * 1.1 * seasonFactor),
          capacite_actuelle: 742,
          taux_utilisation_prevu: Math.round((admissions * 1.1 * seasonFactor) / 742 * 100 * 10) / 10,
          alerte: (admissions * 1.1 * seasonFactor) / 742 > 0.85,
          critique: (admissions * 1.1 * seasonFactor) / 742 > 0.95,
        },
        chirurgie: {
          lits_necessaires: Math.round(admissions * 0.55 * seasonFactor),
          capacite_actuelle: 385,
          taux_utilisation_prevu: Math.round((admissions * 0.55 * seasonFactor) / 385 * 100 * 10) / 10,
          alerte: false,
          critique: false,
        },
        reanimation: {
          lits_necessaires: Math.round(admissions * 0.18 * seasonFactor),
          capacite_actuelle: 104,
          taux_utilisation_prevu: Math.round((admissions * 0.18 * seasonFactor) / 104 * 100 * 10) / 10,
          alerte: (admissions * 0.18 * seasonFactor) / 104 > 0.85,
          critique: (admissions * 0.18 * seasonFactor) / 104 > 0.95,
        },
        total: {
          lits_necessaires: Math.round(admissions * 2.0 * seasonFactor),
          capacite_totale: 1399,
          taux_global: Math.round((admissions * 2.0 * seasonFactor) / 1399 * 100 * 10) / 10,
        }
      },
      personnel: {
        medecins: {
          effectif_necessaire: Math.round(admissions * 0.35),
          effectif_avec_marge: Math.round(admissions * 0.35 * 1.15),
          effectif_disponible: 479,
          taux_mobilisation: Math.round((admissions * 0.35 * 1.15) / 479 * 100 * 10) / 10,
          alerte: false,
          critique: false,
        },
        infirmiers: {
          effectif_necessaire: Math.round(admissions * 1.5),
          effectif_avec_marge: Math.round(admissions * 1.5 * 1.15),
          effectif_disponible: 3200,
          taux_mobilisation: Math.round((admissions * 1.5 * 1.15) / 3200 * 100 * 10) / 10,
          alerte: false,
          critique: false,
        },
        aides_soignants: {
          effectif_necessaire: Math.round(admissions * 1.0),
          effectif_avec_marge: Math.round(admissions * 1.0 * 1.15),
          effectif_disponible: 1500,
          taux_mobilisation: Math.round((admissions * 1.0 * 1.15) / 1500 * 100 * 10) / 10,
          alerte: false,
          critique: false,
        },
      },
      equipements: {
        scanner: {
          examens_prevus: Math.round(admissions * 0.35),
          capacite_jour: 280,
          taux_utilisation: Math.round((admissions * 0.35) / 280 * 100 * 10) / 10,
          alerte: false,
        },
        irm: {
          examens_prevus: Math.round(admissions * 0.18),
          capacite_jour: 120,
          taux_utilisation: Math.round((admissions * 0.18) / 120 * 100 * 10) / 10,
          alerte: false,
        },
        bloc_operatoire: {
          examens_prevus: Math.round(admissions * 0.15),
          capacite_jour: 318,
          taux_utilisation: Math.round((admissions * 0.15) / 318 * 100 * 10) / 10,
          alerte: false,
        },
      },
      alertes: {
        lits: (admissions * 1.1 * seasonFactor) / 742 > 0.85,
        personnel: false,
        equipements: false,
      },
      niveau_risque: Math.min(5, Math.max(1, Math.round((admissions * seasonFactor - 400) / 30))),
    });
  }
  
  const admissions = daily.map(d => d.admissions_prevues);
  
  return {
    generated_at: new Date().toISOString(),
    horizon_jours: days,
    daily,
    summary: {
      admissions_moyenne: Math.round(admissions.reduce((a, b) => a + b, 0) / admissions.length),
      admissions_max: Math.max(...admissions),
      jours_alerte_lits: daily.filter(d => d.alertes.lits).length,
      jours_alerte_personnel: daily.filter(d => d.alertes.personnel).length,
      jours_alerte_equipements: daily.filter(d => d.alertes.equipements).length,
      risque_moyen: Math.round(daily.reduce((sum, d) => sum + d.niveau_risque, 0) / daily.length * 10) / 10,
    },
    recommendations: [],
  };
}
