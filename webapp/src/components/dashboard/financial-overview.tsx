'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Euro,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calculator,
  Users,
  BedDouble,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type FinancialMetric = {
  label: string;
  value: number;
  unit: string;
  variation?: number;
  icon: React.ElementType;
  color: string;
};

type CostBreakdown = {
  categorie: string;
  montant: number;
  pourcentage: number;
  tendance: 'hausse' | 'stable' | 'baisse';
};

type FinancialOverviewProps = {
  coutMoyenSejour?: number;
  coutJournalierTotal?: number;
  coutInterimMensuel?: number;
  tauxHeuresSupp?: number;
  costHistory?: { mois: string; cout: number }[];
};

const defaultCostHistory = [
  { mois: 'Sep', cout: 4200000 },
  { mois: 'Oct', cout: 4500000 },
  { mois: 'Nov', cout: 4350000 },
  { mois: 'Déc', cout: 4800000 },
  { mois: 'Jan', cout: 5100000 },
  { mois: 'Fév', cout: 4900000 },
];

export function FinancialOverview({
  coutMoyenSejour = 6247,
  coutJournalierTotal = 165000,
  coutInterimMensuel = 85000,
  tauxHeuresSupp = 12.5,
  costHistory = defaultCostHistory,
}: FinancialOverviewProps) {
  const metrics: FinancialMetric[] = [
    {
      label: 'Coût moyen / séjour',
      value: coutMoyenSejour,
      unit: '€',
      variation: 3.2,
      icon: Calculator,
      color: 'blue',
    },
    {
      label: 'Coût journalier total',
      value: coutJournalierTotal,
      unit: '€',
      variation: -1.5,
      icon: Euro,
      color: 'green',
    },
    {
      label: 'Intérim / mois',
      value: coutInterimMensuel,
      unit: '€',
      variation: 15.3,
      icon: Users,
      color: 'orange',
    },
    {
      label: 'Heures supp.',
      value: tauxHeuresSupp,
      unit: '%',
      variation: 2.1,
      icon: Clock,
      color: 'purple',
    },
  ];

  const costBreakdown: CostBreakdown[] = [
    { categorie: 'Personnel titulaire', montant: 2800000, pourcentage: 57, tendance: 'stable' },
    { categorie: 'Personnel intérimaire', montant: 450000, pourcentage: 9, tendance: 'hausse' },
    { categorie: 'Heures supplémentaires', montant: 320000, pourcentage: 7, tendance: 'hausse' },
    { categorie: 'Matériel médical', montant: 680000, pourcentage: 14, tendance: 'stable' },
    { categorie: 'Médicaments', montant: 490000, pourcentage: 10, tendance: 'baisse' },
    { categorie: 'Autres', montant: 160000, pourcentage: 3, tendance: 'stable' },
  ];

  // Calculs d'impact
  const economiesPotentielles = {
    reductionInterim: Math.round(coutInterimMensuel * 0.3),
    optimisationLits: Math.round(coutJournalierTotal * 0.05 * 30),
    anticipationPics: Math.round(coutInterimMensuel * 0.4),
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000)}k €`;
    }
    return `${value} €`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Impact Financier
            </CardTitle>
            <CardDescription>
              Suivi des coûts et opportunités d'optimisation
            </CardDescription>
          </div>
          <Badge variant="outline">
            Budget mensuel: 4.9M €
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Métriques principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isPositive = metric.variation && metric.variation > 0;
            const isNegative = metric.variation && metric.variation < 0;
            
            return (
              <div
                key={metric.label}
                className={`rounded-lg p-4 bg-${metric.color}-50`}
              >
                <div className={`flex items-center gap-2 text-${metric.color}-600 mb-1`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{metric.label}</span>
                </div>
                <div className={`text-xl font-bold text-${metric.color}-700`}>
                  {metric.unit === '€' ? formatCurrency(metric.value) : `${metric.value}${metric.unit}`}
                </div>
                {metric.variation !== undefined && (
                  <div className={`text-xs flex items-center gap-1 mt-1 ${
                    // Pour certaines métriques, une hausse est mauvaise (intérim, heures supp)
                    (metric.label.includes('Intérim') || metric.label.includes('Heures')) 
                      ? (isPositive ? 'text-red-600' : 'text-green-600')
                      : (isPositive ? 'text-green-600' : 'text-red-600')
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? '+' : ''}{metric.variation}% vs mois dernier
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Graphique d'évolution des coûts */}
        <div>
          <h4 className="text-sm font-medium mb-3">Évolution des coûts mensuels</h4>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="mois" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value as number), 'Coût total']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cout"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerte coûts intérim */}
        {coutInterimMensuel > 50000 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">
                  Coût intérim élevé : {formatCurrency(coutInterimMensuel)}/mois
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  L'anticipation des besoins en personnel via les prédictions pourrait réduire 
                  ce coût de <strong>{formatCurrency(economiesPotentielles.anticipationPics)}</strong> par mois 
                  en permettant de mobiliser le pool interne plutôt que l'intérim.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Économies potentielles */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-green-600" />
            Économies potentielles avec l'outil prédictif
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(economiesPotentielles.reductionInterim)}
              </div>
              <div className="text-xs text-green-600">
                Réduction intérim (-30%)
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(economiesPotentielles.optimisationLits)}
              </div>
              <div className="text-xs text-green-600">
                Optimisation capacité (+5%)
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(economiesPotentielles.anticipationPics)}
              </div>
              <div className="text-xs text-green-600">
                Anticipation des pics
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Estimations basées sur les données historiques et les benchmarks hospitaliers
          </p>
        </div>

        {/* Répartition des coûts simplifiée */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Répartition des coûts mensuels</h4>
          <div className="space-y-2">
            {costBreakdown.slice(0, 4).map((item) => (
              <div key={item.categorie} className="flex items-center gap-3">
                <div className="w-32 text-sm truncate">{item.categorie}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.tendance === 'hausse' ? 'bg-orange-500' : 
                      item.tendance === 'baisse' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${item.pourcentage}%` }}
                  />
                </div>
                <div className="w-20 text-sm text-right font-medium">
                  {formatCurrency(item.montant)}
                </div>
                <div className="w-12 text-xs text-muted-foreground">
                  {item.pourcentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
