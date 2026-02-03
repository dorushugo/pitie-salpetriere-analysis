import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), '..', 'data', 'backtest_results.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return NextResponse.json(data);
  } catch (error) {
    // Retourner des résultats par défaut si le fichier n'existe pas
    return NextResponse.json({
      generated_at: new Date().toISOString(),
      data_source: 'hospitalisations_covid.csv (Paris)',
      model: 'RandomForest',
      results: {
        horizon_1: { metrics: { mae: 13.76, mape: 31, r2: 0.29 } },
        horizon_3: { metrics: { mae: 14.19, mape: 32, r2: 0.32 } },
        horizon_7: { metrics: { mae: 14.38, mape: 33, r2: 0.18 } },
        horizon_14: { metrics: { mae: 18.05, mape: 41, r2: -0.08 } },
        horizon_30: { metrics: { mae: 42.71, mape: 97, r2: -3.85 } },
      }
    });
  }
}
