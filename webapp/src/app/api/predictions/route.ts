import { NextRequest, NextResponse } from 'next/server';
import {
  getARIMAPredictions,
  getRFPredictions,
  getEnsemblePredictions,
  getSeasonalityAnalysis,
  getDailyStats,
} from '@/lib/data';
import { generatePredictionRecommandations } from '@/lib/calculations';
import { promises as fs } from 'fs';
import path from 'path';

async function getOptimizedEnsemblePredictions() {
  try {
    const dataDir = path.join(process.cwd(), '..', 'data');
    const content = await fs.readFile(path.join(dataDir, 'predictions_ensemble_optimized.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getProphetPredictions() {
  try {
    const dataDir = path.join(process.cwd(), '..', 'data');
    const content = await fs.readFile(path.join(dataDir, 'predictions_prophet.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get('model') || 'ensemble_optimized';
    const includeRecommandations = searchParams.get('recommandations') === 'true';
    
    let predictions;
    
    switch (model) {
      case 'arima':
        predictions = await getARIMAPredictions();
        break;
      case 'prophet':
        predictions = await getProphetPredictions();
        break;
      case 'rf':
      case 'random_forest':
        predictions = await getRFPredictions();
        break;
      case 'ensemble_optimized':
        predictions = await getOptimizedEnsemblePredictions();
        if (!predictions) {
          predictions = await getEnsemblePredictions();
        }
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
        ? predictions.predictions.map((p: { date: string; ensemble_prediction?: number; predicted_admissions?: number }) => ({
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
