'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceDailyStats, ServiceType } from '@/lib/types';

type ServicesBarChartProps = {
  data: ServiceDailyStats[];
  title?: string;
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  'Urgences': '#ef4444',
  'Cardiologie': '#f97316',
  'Neurologie': '#eab308',
  'Maladies Infectieuses': '#22c55e',
  'Pédiatrie': '#3b82f6',
  'Réanimation': '#8b5cf6',
};

export function ServicesBarChart({ 
  data, 
  title = 'Admissions par Service' 
}: ServicesBarChartProps) {
  // Agréger par service (somme des derniers 7 jours)
  const dates = [...new Set(data.map(d => d.date))].sort().slice(-7);
  const filteredData = data.filter(d => dates.includes(d.date));
  
  const aggregated = Object.values(
    filteredData.reduce((acc, curr) => {
      if (!acc[curr.service]) {
        acc[curr.service] = { 
          service: curr.service, 
          admissions: 0,
          cas_graves: 0,
        };
      }
      acc[curr.service].admissions += curr.admissions;
      acc[curr.service].cas_graves += curr.cas_graves;
      return acc;
    }, {} as Record<string, { service: string; admissions: number; cas_graves: number }>)
  ).sort((a, b) => b.admissions - a.admissions);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aggregated} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="service" 
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="admissions"
                name="Admissions"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="cas_graves"
                name="Cas graves"
                fill="hsl(var(--destructive))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
