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
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Euro,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { SimulationResult, Recommandation } from '@/lib/types';

type SimulationResultsProps = {
  result: SimulationResult;
};

const PRIORITY_COLORS: Record<Recommandation['priorite'], string> = {
  critique: 'bg-red-100 text-red-800 border-red-200',
  haute: 'bg-orange-100 text-orange-800 border-orange-200',
  moyenne: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  basse: 'bg-green-100 text-green-800 border-green-200',
};

const TYPE_LABELS: Record<Recommandation['type'], string> = {
  rh: 'Ressources Humaines',
  logistique: 'Logistique',
  operationnel: 'Opérationnel',
};

export function SimulationResults({ result }: SimulationResultsProps) {
  const chartData = result.projections.map(p => ({
    date: new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    base: p.admissions_base,
    simulees: p.admissions_simulees,
    lits: p.lits_requis,
    saturation: p.alerte_saturation,
  }));

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé de la Simulation</CardTitle>
          <CardDescription>
            Scénario: {result.scenario.type} sur {result.scenario.duree_jours} jours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Pic d'admissions
              </p>
              <p className="text-2xl font-bold">{result.resume.pic_admissions}</p>
              <p className="text-xs text-muted-foreground">par jour</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Total admissions
              </p>
              <p className="text-2xl font-bold">
                {result.resume.total_admissions.toLocaleString('fr-FR')}
              </p>
              <p className="text-xs text-muted-foreground">sur la période</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Personnel supplémentaire
              </p>
              <p className="text-2xl font-bold">{result.resume.personnel_supplementaire}</p>
              <p className="text-xs text-muted-foreground">agents/jour</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Euro className="h-4 w-4" />
                Coût estimé
              </p>
              <p className="text-2xl font-bold">
                {(result.resume.cout_total / 1000000).toFixed(1)}M€
              </p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>
          </div>

          {result.resume.jours_saturation > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Risque de saturation</AlertTitle>
              <AlertDescription>
                {result.resume.jours_saturation} jours avec dépassement de capacité prévu.
                Activation du plan blanc recommandée.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Graphique des projections */}
      <Card>
        <CardHeader>
          <CardTitle>Projection des Admissions</CardTitle>
          <CardDescription>
            Comparaison entre le scénario de base et le scénario simulé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="base"
                  name="Admissions (base)"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="simulees"
                  name="Admissions (simulées)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="lits"
                  name="Lits requis"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommandations</CardTitle>
          <CardDescription>
            Actions suggérées pour gérer ce scénario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {result.recommandations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${PRIORITY_COLORS[rec.priorite]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[rec.type]}
                      </Badge>
                      <Badge 
                        variant={rec.priorite === 'critique' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {rec.priorite.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{rec.message}</p>
                    {rec.date_effet && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Date d'effet: {new Date(rec.date_effet).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Détail journalier */}
      <Card>
        <CardHeader>
          <CardTitle>Détail Journalier</CardTitle>
          <CardDescription>
            Projections détaillées pour chaque jour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Admissions</th>
                  <th className="text-right p-2">Lits requis</th>
                  <th className="text-right p-2">Personnel</th>
                  <th className="text-right p-2">Coût</th>
                  <th className="text-center p-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {result.projections.slice(0, 14).map((p, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">
                      {new Date(p.date).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="text-right p-2 font-medium">
                      {p.admissions_simulees}
                    </td>
                    <td className="text-right p-2">{p.lits_requis}</td>
                    <td className="text-right p-2">{p.personnel_requis}</td>
                    <td className="text-right p-2">
                      {(p.cout_estime / 1000).toFixed(0)}k€
                    </td>
                    <td className="text-center p-2">
                      {p.alerte_saturation ? (
                        <XCircle className="h-4 w-4 text-red-500 inline" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.projections.length > 14 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                ... et {result.projections.length - 14} jours supplémentaires
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
