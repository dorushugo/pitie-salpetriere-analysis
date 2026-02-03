'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DailyStats } from '@/lib/types';

type AdmissionsChartProps = {
  data: DailyStats[];
  title?: string;
  showArea?: boolean;
};

export function AdmissionsChart({ 
  data, 
  title = 'Évolution des Admissions',
  showArea = false 
}: AdmissionsChartProps) {
  const formattedData = data.map((d, index) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('fr-FR', { 
      day: '2-digit',
      month: 'short' 
    }),
    index,
  }));

  const Chart = showArea ? AreaChart : LineChart;
  
  // Calculer l'intervalle pour afficher ~6-8 labels
  const tickInterval = Math.max(1, Math.floor(data.length / 7));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              {showArea ? (
                <Area
                  type="monotone"
                  dataKey="admissions"
                  name="Admissions"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="admissions"
                  name="Admissions"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
