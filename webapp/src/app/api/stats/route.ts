import { NextRequest, NextResponse } from 'next/server';
import { getFilteredStats, getMonthlyAggregates } from '@/lib/data';
import type { ServiceType } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateDebut = searchParams.get('dateDebut') || undefined;
    const dateFin = searchParams.get('dateFin') || undefined;
    const service = searchParams.get('service') as ServiceType | undefined;
    const aggregation = searchParams.get('aggregation');
    
    if (aggregation === 'monthly') {
      const monthly = await getMonthlyAggregates();
      return NextResponse.json({ data: monthly });
    }
    
    const stats = await getFilteredStats(dateDebut, dateFin, service);
    
    return NextResponse.json({
      daily: stats.daily.slice(-90), // Derniers 90 jours par défaut
      services: stats.services.slice(-540), // 90 jours * 6 services
      resources: stats.resources.slice(-540),
      total: {
        daily: stats.daily.length,
        services: stats.services.length,
        resources: stats.resources.length,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
