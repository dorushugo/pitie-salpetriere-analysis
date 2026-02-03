'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EnsemblePrediction, Prediction } from '@/lib/types';

type PredictionsChartProps = {
  predictions: (EnsemblePrediction | Prediction)[];
  title?: string;
  metrics?: {
    mae: number;
    rmse: number;
    mape: number;
    r2: number;
  };
  showConfidence?: boolean;
};

export function PredictionsChart({
  predictions,
  title = 'Prédictions des Admissions',
  metrics,
  showConfidence = true,
}: PredictionsChartProps) {
  const formattedData = predictions.map(p => {
    const isEnsemble = 'ensemble_prediction' in p;
    return {
      date: new Date(p.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      }),
      prediction: isEnsemble ? p.ensemble_prediction : p.predicted_admissions,
      arima: isEnsemble ? p.arima_prediction : undefined,
      rf: isEnsemble ? p.rf_prediction : undefined,
      lower: p.lower_bound,
      upper: p.upper_bound,
    };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {metrics && (
              <CardDescription className="mt-1">
                Performance du modèle
              </CardDescription>
            )}
          </div>
          {metrics && (
            <div className="flex gap-2">
              <Badge variant="outline">R²: {metrics.r2.toFixed(2)}</Badge>
              <Badge variant="outline">MAPE: {metrics.mape.toFixed(1)}%</Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
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
              
              {showConfidence && (
                <Area
                  type="monotone"
                  dataKey="upper"
                  stackId="confidence"
                  stroke="none"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  name="Intervalle supérieur"
                />
              )}
              
              {showConfidence && (
                <Area
                  type="monotone"
                  dataKey="lower"
                  stackId="confidence"
                  stroke="none"
                  fill="hsl(var(--background))"
                  name="Intervalle inférieur"
                />
              )}
              
              <Line
                type="monotone"
                dataKey="prediction"
                name="Prédiction Ensemble"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={false}
              />
              
              {formattedData[0]?.arima !== undefined && (
                <Line
                  type="monotone"
                  dataKey="arima"
                  name="ARIMA"
                  stroke="#f97316"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              
              {formattedData[0]?.rf !== undefined && (
                <Line
                  type="monotone"
                  dataKey="rf"
                  name="Random Forest"
                  stroke="#22c55e"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
