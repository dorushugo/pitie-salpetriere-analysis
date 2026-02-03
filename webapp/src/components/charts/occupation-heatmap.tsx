'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ResourceStats, ServiceType } from '@/lib/types';

type OccupationHeatmapProps = {
  data: ResourceStats[];
  title?: string;
};

const SERVICES: ServiceType[] = [
  'Urgences',
  'Cardiologie',
  'Neurologie',
  'Maladies Infectieuses',
  'Pédiatrie',
  'Réanimation',
];

function getOccupationColor(taux: number): string {
  if (taux >= 95) return 'bg-red-600';
  if (taux >= 85) return 'bg-orange-500';
  if (taux >= 70) return 'bg-yellow-500';
  if (taux >= 50) return 'bg-green-500';
  return 'bg-green-300';
}

export function OccupationHeatmap({ 
  data, 
  title = 'Taux d\'Occupation par Service' 
}: OccupationHeatmapProps) {
  // Grouper par date et service
  const latestDate = data.length > 0 
    ? [...new Set(data.map(d => d.date))].sort().slice(-7) 
    : [];
  
  const groupedData = new Map<string, Map<string, number>>();
  
  data.forEach(d => {
    if (latestDate.includes(d.date)) {
      if (!groupedData.has(d.date)) {
        groupedData.set(d.date, new Map());
      }
      groupedData.get(d.date)!.set(d.service, d.taux_occupation);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2 text-sm font-medium text-muted-foreground">Service</th>
                {latestDate.map(date => (
                  <th key={date} className="text-center p-2 text-sm font-medium text-muted-foreground">
                    {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERVICES.map(service => (
                <tr key={service} className="border-t">
                  <td className="p-2 text-sm font-medium">{service}</td>
                  {latestDate.map(date => {
                    const taux = groupedData.get(date)?.get(service) ?? 0;
                    return (
                      <td key={date} className="p-2 text-center">
                        <div 
                          className={`inline-flex items-center justify-center w-12 h-8 rounded text-white text-xs font-bold ${getOccupationColor(taux)}`}
                          title={`${taux}%`}
                        >
                          {Math.round(taux)}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-300" />
            <span>&lt;50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>50-70%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span>70-85%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span>85-95%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-600" />
            <span>&gt;95%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
