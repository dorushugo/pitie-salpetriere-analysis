import { NextRequest, NextResponse } from 'next/server';
import {
  getARIMAPredictions,
  getRFPredictions,
  getEnsemblePredictions,
  getSeasonalityAnalysis,
  getDailyStats,
} from '@/lib/data';
import { generatePredictionRecommandations } from '@/lib/calculations';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get('model') || 'ensemble';
    const includeRecommandations = searchParams.get('recommandations') === 'true';
    
    let predictions;
    
    switch (model) {
      case 'arima':
        predictions = await getARIMAPredictions();
        break;
      case 'rf':
      case 'random_forest':
        predictions = await getRFPredictions();
        break;
      case 'ensemble':
      default:
        predictions = await getEnsemblePredictions();
        break;
    }
    
    // Ajouter l'analyse de saisonnalité
    const seasonality = await getSeasonalityAnalysis();
    
    // Générer des recommandations si demandé
    let recommandations = null;
    if (includeRecommandations) {
      const dailyStats = await getDailyStats();
      const avgAdmissions = dailyStats.reduce((sum, d) => sum + d.admissions, 0) / dailyStats.length;
      
      const predsForRecommandations = 'predictions' in predictions 
        ? predictions.predictions.map(p => ({
            date: p.date,
            predicted_admissions: 'ensemble_prediction' in p 
              ? p.ensemble_prediction 
              : p.predicted_admissions
          }))
        : [];
      
      recommandations = generatePredictionRecommandations(predsForRecommandations, avgAdmissions);
    }
    
    return NextResponse.json({
      ...predictions,
      seasonality,
      recommandations,
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des prédictions' },
      { status: 500 }
    );
  }
}
