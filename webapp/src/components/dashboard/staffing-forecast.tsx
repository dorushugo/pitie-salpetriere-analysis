'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserPlus,
  UserMinus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Phone,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

type DayForecast = {
  date: string;
  jour: string;
  personnelPrevu: number;
  personnelRequis: number;
  deficit: number;
  evenement?: string;
};

type StaffingForecastProps = {
  forecast: DayForecast[];
  personnelActuel: number;
  poolRemplacement: number;
};

// Données par défaut pour la démo
const defaultForecast: DayForecast[] = [
  { date: '2026-02-02', jour: 'Lun', personnelPrevu: 285, personnelRequis: 290, deficit: -5 },
  { date: '2026-02-03', jour: 'Mar', personnelPrevu: 280, personnelRequis: 285, deficit: -5 },
  { date: '2026-02-04', jour: 'Mer', personnelPrevu: 275, personnelRequis: 280, deficit: -5 },
  { date: '2026-02-05', jour: 'Jeu', personnelPrevu: 270, personnelRequis: 310, deficit: -40, evenement: 'Pic grippal prévu' },
  { date: '2026-02-06', jour: 'Ven', personnelPrevu: 275, personnelRequis: 320, deficit: -45, evenement: 'Pic grippal' },
  { date: '2026-02-07', jour: 'Sam', personnelPrevu: 240, personnelRequis: 300, deficit: -60, evenement: 'Weekend + Pic' },
  { date: '2026-02-08', jour: 'Dim', personnelPrevu: 230, personnelRequis: 290, deficit: -60, evenement: 'Weekend + Pic' },
  { date: '2026-02-09', jour: 'Lun', personnelPrevu: 285, personnelRequis: 295, deficit: -10 },
  { date: '2026-02-10', jour: 'Mar', personnelPrevu: 280, personnelRequis: 285, deficit: -5 },
  { date: '2026-02-11', jour: 'Mer', personnelPrevu: 275, personnelRequis: 280, deficit: -5 },
  { date: '2026-02-12', jour: 'Jeu', personnelPrevu: 280, personnelRequis: 280, deficit: 0 },
  { date: '2026-02-13', jour: 'Ven', personnelPrevu: 275, personnelRequis: 275, deficit: 0 },
  { date: '2026-02-14', jour: 'Sam', personnelPrevu: 240, personnelRequis: 250, deficit: -10 },
];

export function StaffingForecast({
  forecast,
  personnelActuel = 286,
  poolRemplacement = 45,
}: StaffingForecastProps) {
  // Utiliser les données par défaut si forecast est vide
  const forecastData = forecast && forecast.length > 0 ? forecast : defaultForecast;
  
  // Arrondir le personnel (pas de décimales pour des personnes)
  const effectifActuel = Math.round(personnelActuel);
  
  // Calculer les statistiques
  const totalDeficit = forecastData.reduce((sum, d) => sum + Math.max(0, -d.deficit), 0);
  const joursEnDeficit = forecastData.filter(d => d.deficit < -10).length;
  const maxDeficit = forecastData.length > 0 ? Math.min(...forecastData.map(d => d.deficit)) : 0;
  const joursAlerte = forecastData.filter(d => d.deficit < -20);

  // Préparer les données pour le graphique
  const chartData = forecastData.map(d => ({
    ...d,
    prevu: d.personnelPrevu,
    requis: d.personnelRequis,
    ecart: d.personnelPrevu - d.personnelRequis,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planning RH Prévisionnel
            </CardTitle>
            <CardDescription>
              Anticipation des besoins en personnel sur 14 jours
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Contacter le pool
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPIs RH */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Effectif actuel</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{effectifActuel}</div>
            <div className="text-xs text-blue-600">soignants présents</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <UserPlus className="h-4 w-4" />
              <span className="text-sm">Pool disponible</span>
            </div>
            <div className="text-2xl font-bold text-green-700">{poolRemplacement}</div>
            <div className="text-xs text-green-600">remplaçants mobilisables</div>
          </div>

          <div className={`rounded-lg p-4 ${joursEnDeficit > 3 ? 'bg-red-50' : 'bg-orange-50'}`}>
            <div className={`flex items-center gap-2 mb-1 ${joursEnDeficit > 3 ? 'text-red-600' : 'text-orange-600'}`}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Jours critiques</span>
            </div>
            <div className={`text-2xl font-bold ${joursEnDeficit > 3 ? 'text-red-700' : 'text-orange-700'}`}>
              {joursEnDeficit}
            </div>
            <div className={`text-xs ${joursEnDeficit > 3 ? 'text-red-600' : 'text-orange-600'}`}>
              déficit &gt; 10 personnes
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <UserMinus className="h-4 w-4" />
              <span className="text-sm">Déficit max</span>
            </div>
            <div className="text-2xl font-bold text-purple-700">{Math.abs(maxDeficit)}</div>
            <div className="text-xs text-purple-600">personnes manquantes</div>
          </div>
        </div>

        {/* Alertes sur les jours critiques */}
        {joursAlerte.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
              <AlertTriangle className="h-5 w-5" />
              Jours nécessitant une action immédiate
            </div>
            <div className="space-y-2">
              {joursAlerte.slice(0, 3).map((jour) => (
                <div key={jour.date} className="flex items-center justify-between bg-white rounded p-2">
                  <div>
                    <span className="font-medium">
                      {new Date(jour.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    {jour.evenement && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {jour.evenement}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-red-600 font-bold">
                      {jour.deficit} personnes
                    </span>
                    <Button size="sm" variant="outline">
                      Planifier
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Graphique prévisionnel */}
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="jour" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[200, 350]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border rounded-lg shadow-lg p-3">
                        <p className="font-medium mb-1">
                          {new Date(data.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                        {data.evenement && (
                          <p className="text-orange-600 text-sm mb-2">{data.evenement}</p>
                        )}
                        <div className="space-y-1 text-sm">
                          <p>Prévu: <span className="font-medium">{data.prevu}</span></p>
                          <p>Requis: <span className="font-medium">{data.requis}</span></p>
                          <p className={data.ecart < 0 ? 'text-red-600' : 'text-green-600'}>
                            Écart: <span className="font-bold">{data.ecart > 0 ? '+' : ''}{data.ecart}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine 
                y={280} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ value: 'Seuil optimal', position: 'right', fontSize: 10 }}
              />
              <Bar dataKey="prevu" name="Personnel prévu" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.ecart < -20
                        ? 'hsl(0, 84%, 60%)'
                        : entry.ecart < -10
                        ? 'hsl(25, 95%, 53%)'
                        : entry.ecart < 0
                        ? 'hsl(48, 96%, 53%)'
                        : 'hsl(142, 76%, 36%)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Légende */}
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Équilibre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Déficit léger (&lt;10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>Déficit modéré (10-20)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Déficit critique (&gt;20)</span>
          </div>
        </div>

        {/* Recommandations */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Recommandations pour couvrir les besoins
          </h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
              <span>
                <strong>Mobiliser {Math.min(Math.abs(maxDeficit), poolRemplacement)} remplaçants</strong> du pool 
                pour couvrir le pic du {joursAlerte[0] && new Date(joursAlerte[0].date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
              <span>
                <strong>Proposer des heures supplémentaires</strong> aux équipes disponibles pour le weekend
              </span>
            </li>
            {Math.abs(maxDeficit) > poolRemplacement && (
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-orange-500" />
                <span className="text-orange-700">
                  <strong>Faire appel à l'intérim</strong> : déficit potentiel de {Math.abs(maxDeficit) - poolRemplacement} personnes 
                  non couvrables par le pool
                </span>
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
