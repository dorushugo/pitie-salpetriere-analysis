import { NextRequest, NextResponse } from 'next/server';
import { 
  getDailyStats, 
  getServiceStats, 
  getResourceStats,
  getEnsemblePredictions,
} from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'admissions';
    const format = searchParams.get('format') || 'csv';

    let data: unknown[] = [];
    let filename = 'export';

    switch (type) {
      case 'admissions':
        data = await getDailyStats();
        filename = 'admissions_journalieres';
        break;
      case 'services':
        data = await getServiceStats();
        filename = 'stats_services';
        break;
      case 'resources':
        data = await getResourceStats();
        filename = 'ressources';
        break;
      case 'predictions':
        const predictions = await getEnsemblePredictions();
        data = predictions.predictions.map(p => ({
          date: p.date,
          arima: p.arima_prediction,
          random_forest: p.rf_prediction,
          ensemble: p.ensemble_prediction,
          minimum: p.lower_bound,
          maximum: p.upper_bound,
        }));
        filename = 'predictions';
        break;
      default:
        return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    }

    return NextResponse.json({ error: 'Format invalide' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'export' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: unknown[]): string {
  if (data.length === 0) return '';

  const firstRow = data[0] as Record<string, unknown>;
  const headers = Object.keys(firstRow);
  const rows = data.map(item => {
    const row = item as Record<string, unknown>;
    return headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return String(value ?? '');
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
