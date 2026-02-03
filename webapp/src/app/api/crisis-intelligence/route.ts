import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface CrisisIntelligence {
  generated_at: string;
  source: string;
  components: {
    epidemic_waves: {
      waves: Array<{
        start: string;
        peak_date: string;
        end: string;
        duration_weeks: number;
        peak_value: number;
        time_to_peak_weeks: number;
      }>;
      patterns: {
        avg_duration_weeks: number;
        avg_time_to_peak_weeks: number;
        threshold_75pct: number;
      };
    };
    grippe_seasonality: {
      alert_levels: Record<string, number>;
      calendar: Record<string, {
        expected_incidence: number;
        expected_level: string;
        historical_max: number;
        historical_min: number;
        variability: number;
      }>;
      critical_weeks: number[];
      vigilance_weeks: number[];
    };
    crisis_response: {
      metrics: {
        baseline_daily: number;
        alert_threshold_p75: number;
        crisis_threshold_p95: number;
        max_observed: number;
        rapid_growth_days_pct: number;
      };
      staffing_recommendations: Record<string, {
        description: string;
        staffing_factor: number;
        beds_reserve_pct: number;
        actions: string[];
      }>;
    };
    early_warning_rules: Record<string, {
      name: string;
      conditions: Array<{
        metric: string;
        operator: string;
        value: number | number[];
        unit: string;
        description: string;
      }>;
      actions: string[];
      lead_time_days: number;
    }>;
    staffing_calendar: Record<string, {
      activity_ratio: number;
      staffing_factor: number;
      level: string;
      color: string;
      recommended_actions: string[];
    }>;
  };
}

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), '..', 'data', 'crisis_intelligence.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const data: CrisisIntelligence = JSON.parse(fileContent);
    
    // Ajouter le contexte actuel (semaine courante)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    
    const currentWeekData = data.components.staffing_calendar[String(currentWeek)] || {
      activity_ratio: 1.0,
      staffing_factor: 1.0,
      level: 'normal',
      color: 'blue',
      recommended_actions: []
    };
    
    // Déterminer l'alerte saisonnière
    const seasonalAlert = data.components.grippe_seasonality.calendar[String(currentWeek)] || {
      expected_level: 'normal',
      expected_incidence: 0
    };
    
    return NextResponse.json({
      ...data,
      current_context: {
        week: currentWeek,
        date: now.toISOString(),
        staffing: currentWeekData,
        seasonal_alert: seasonalAlert,
      }
    });
  } catch (error) {
    console.error('Error loading crisis intelligence:', error);
    return NextResponse.json(
      { error: 'Impossible de charger les données d\'intelligence épidémique' },
      { status: 500 }
    );
  }
}
