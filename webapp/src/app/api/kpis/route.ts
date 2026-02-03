import { NextResponse } from 'next/server';
import { getDashboardKPIs } from '@/lib/data';

export async function GET() {
  try {
    const kpis = await getDashboardKPIs();
    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des KPIs' },
      { status: 500 }
    );
  }
}
