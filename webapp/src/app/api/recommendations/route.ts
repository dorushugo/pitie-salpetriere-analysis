import { NextResponse } from 'next/server';
import { 
  generateSmartRecommendations, 
  generateScenarioRecommendations,
  type HospitalState 
} from '@/lib/recommendations';
import { getDashboardKPIs, getResourceStats, getEnsemblePredictions } from '@/lib/data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'current';
    
    // Charger les données actuelles
    const [kpis, resources, predictions] = await Promise.all([
      getDashboardKPIs(),
      getResourceStats(),
      getEnsemblePredictions().catch(() => null),
    ]);
    
    // Construire l'état de l'hôpital
    const latestResources = resources.slice(-6); // Derniers 6 services
    const tauxOccupationParService: Record<string, number> = {};
    latestResources.forEach(r => {
      tauxOccupationParService[r.service] = r.taux_occupation;
    });
    
    // Déterminer la saison
    const month = new Date().getMonth() + 1;
    let saison: 'hiver' | 'printemps' | 'ete' | 'automne';
    if (month >= 12 || month <= 2) saison = 'hiver';
    else if (month >= 3 && month <= 5) saison = 'printemps';
    else if (month >= 6 && month <= 8) saison = 'ete';
    else saison = 'automne';
    
    // Calculer la variation prévue
    let variationPrevue7j = 0;
    let picPrevu = null;
    if (predictions?.predictions) {
      const avgAdmissions = predictions.predictions.reduce((sum, p) => sum + p.ensemble_prediction, 0) / predictions.predictions.length;
      const baseline = kpis.admissions_semaine / 7;
      variationPrevue7j = Math.round(((avgAdmissions - baseline) / baseline) * 100);
      
      // Trouver le pic
      const maxPred = predictions.predictions.reduce((max, p) => 
        p.ensemble_prediction > max.ensemble_prediction ? p : max
      );
      const maxVariation = Math.round(((maxPred.ensemble_prediction - baseline) / baseline) * 100);
      if (maxVariation > 10) {
        picPrevu = { date: maxPred.date, variation: maxVariation };
      }
    }
    
    const state: HospitalState = {
      tauxOccupationGlobal: kpis.taux_occupation_moyen,
      tauxOccupationParService: tauxOccupationParService as any,
      personnelDisponible: kpis.personnel_disponible,
      personnelRequis: Math.round(kpis.personnel_disponible * 1.1), // Estimation +10%
      admissionsAujourdhui: kpis.admissions_aujourdhui,
      admissionsMoyenne: Math.round(kpis.admissions_semaine / 7),
      variationPrevue7j,
      picPrevu,
      saison,
      jourSemaine: new Date().getDay(),
      evenementEnCours: null,
      litsDisponibles: latestResources.reduce((sum, r) => sum + r.lits_disponibles, 0),
      litsTotal: latestResources.reduce((sum, r) => sum + r.lits_total, 0),
      stocksCritiques: false,
      tauxInterim: 8, // Valeur simulée
      tauxHeuresSupp: 12, // Valeur simulée
    };
    
    if (type === 'current') {
      const recommendations = generateSmartRecommendations(state);
      return NextResponse.json({
        state,
        recommendations,
        generated_at: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      state,
      recommendations: generateSmartRecommendations(state),
      generated_at: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Erreur génération recommandations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération des recommandations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenarioType, intensite, dureeJours, impactAdmissions } = body;
    
    if (!scenarioType) {
      return NextResponse.json(
        { error: 'scenarioType requis' },
        { status: 400 }
      );
    }
    
    const recommendations = generateScenarioRecommendations(
      scenarioType,
      intensite || 1,
      dureeJours || 7,
      impactAdmissions || 100
    );
    
    return NextResponse.json({
      scenario: scenarioType,
      recommendations,
      generated_at: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Erreur génération recommandations scénario:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération des recommandations' },
      { status: 500 }
    );
  }
}
