'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Calendar,
  TrendingUp,
  Users,
  Activity,
  Shield,
  Thermometer,
  Clock,
  ChevronRight,
  Info,
  Bell,
  BarChart3,
} from 'lucide-react';

interface CrisisData {
  generated_at: string;
  current_context: {
    week: number;
    date: string;
    staffing: {
      activity_ratio: number;
      staffing_factor: number;
      level: string;
      color: string;
      recommended_actions: string[];
    };
    seasonal_alert: {
      expected_level: string;
      expected_incidence: number;
    };
  };
  components: {
    epidemic_waves: {
      patterns: {
        avg_duration_weeks: number;
        avg_time_to_peak_weeks: number;
      };
    };
    grippe_seasonality: {
      alert_levels: Record<string, number>;
      vigilance_weeks: number[];
    };
    crisis_response: {
      metrics: {
        baseline_daily: number;
        crisis_threshold_p95: number;
        max_observed: number;
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
    }>;
  };
}

const levelColors: Record<string, string> = {
  calme: 'bg-green-100 text-green-800 border-green-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  vigilance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  epidemie: 'bg-orange-100 text-orange-800 border-orange-200',
  crise: 'bg-red-100 text-red-800 border-red-200',
};

const levelLabels: Record<string, string> = {
  calme: 'Période calme',
  normal: 'Activité normale',
  vigilance: 'Vigilance',
  pre_epidemie: 'Pré-épidémie',
  epidemie: 'Épidémie',
  crise: 'Crise',
};

export function CrisisIntelligence() {
  const [data, setData] = useState<CrisisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crisis-intelligence')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching crisis intelligence:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Chargement de l&apos;intelligence épidémique...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
          <p className="text-muted-foreground">Données d&apos;intelligence non disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const { current_context, components } = data;
  const currentLevel = current_context.staffing.level;

  // Générer le calendrier des 12 prochaines semaines
  const weekCalendar = [];
  for (let i = 0; i < 12; i++) {
    const week = ((current_context.week + i - 1) % 52) + 1;
    const weekData = components.staffing_calendar[String(week)];
    weekCalendar.push({
      week,
      offset: i,
      ...weekData,
    });
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statut actuel */}
      <Card className={`border-2 ${levelColors[currentLevel] || levelColors.normal}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              <div>
                <CardTitle>Intelligence Épidémique</CardTitle>
                <CardDescription>
                  Basée sur 42 ans de données Sentinelles + COVID SPF
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={levelColors[currentLevel]}>
              Semaine {current_context.week} - {levelLabels[currentLevel] || currentLevel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Staffing recommandé</p>
                <p className="text-xl font-bold">
                  x{current_context.staffing.staffing_factor.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ratio d&apos;activité</p>
                <p className="text-xl font-bold">
                  {(current_context.staffing.activity_ratio * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <Thermometer className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Incidence attendue</p>
                <p className="text-xl font-bold">
                  {current_context.seasonal_alert.expected_incidence}/100k
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Durée moy. vague</p>
                <p className="text-xl font-bold">
                  {components.epidemic_waves.patterns.avg_duration_weeks} sem
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendrier</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertes</span>
          </TabsTrigger>
          <TabsTrigger value="response" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Réponse</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        {/* Calendrier prévisionnel */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendrier Prévisionnel de Staffing
              </CardTitle>
              <CardDescription>
                Prévisions sur 12 semaines basées sur 42 ans d&apos;historique grippal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                {weekCalendar.map((week) => (
                  <div
                    key={week.week}
                    className={`p-2 rounded-lg text-center border-2 ${
                      week.offset === 0 ? 'ring-2 ring-blue-500' : ''
                    } ${levelColors[week.level] || levelColors.normal}`}
                  >
                    <p className="text-xs font-medium">S{week.week}</p>
                    <p className="text-lg font-bold">x{week.staffing_factor.toFixed(1)}</p>
                    <p className="text-xs opacity-75">
                      {(week.activity_ratio * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {Object.entries(levelLabels).slice(0, 5).map(([key, label]) => (
                  <Badge key={key} variant="outline" className={levelColors[key]}>
                    {label}
                  </Badge>
                ))}
              </div>

              {/* Actions recommandées actuelles */}
              {current_context.staffing.recommended_actions.length > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <ChevronRight className="h-4 w-4" />
                    Actions recommandées cette semaine
                  </h4>
                  <ul className="space-y-2">
                    {current_context.staffing.recommended_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Règles d'alerte */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Règles d&apos;Alerte Précoce
              </CardTitle>
              <CardDescription>
                Système de détection anticipée basé sur les patterns historiques
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(components.early_warning_rules).map(([id, rule]) => (
                <div
                  key={id}
                  className="p-4 border rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {rule.name}
                    </h4>
                    <Badge variant="secondary">
                      Anticipation: {rule.lead_time_days}j
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        CONDITIONS DE DÉCLENCHEMENT
                      </p>
                      <ul className="space-y-1">
                        {rule.conditions.map((cond, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-amber-500">⚡</span>
                            {cond.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        ACTIONS À DÉCLENCHER
                      </p>
                      <ul className="space-y-1">
                        {rule.actions.map((action, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Réponse aux crises */}
        <TabsContent value="response">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Protocoles de Réponse par Niveau
              </CardTitle>
              <CardDescription>
                Actions recommandées selon le niveau d&apos;alerte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(components.crisis_response.staffing_recommendations).map(
                ([level, config]) => (
                  <div
                    key={level}
                    className={`p-4 rounded-lg border-2 ${
                      levelColors[level] || 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold capitalize">
                          {levelLabels[level] || level}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">x{config.staffing_factor}</p>
                        <p className="text-xs text-muted-foreground">
                          Réserve lits: {config.beds_reserve_pct}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <Progress 
                        value={config.staffing_factor * 50} 
                        className="h-2 mb-2"
                      />
                      <div className="flex flex-wrap gap-1">
                        {config.actions.map((action, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights épidémiques */}
        <TabsContent value="insights">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5" />
                  Patterns des Vagues Épidémiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Durée moyenne d&apos;une vague</span>
                  <span className="font-bold">
                    {components.epidemic_waves.patterns.avg_duration_weeks} semaines
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Temps moyen jusqu&apos;au pic</span>
                  <span className="font-bold">
                    {components.epidemic_waves.patterns.avg_time_to_peak_weeks} semaines
                  </span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                    <span>
                      En moyenne, vous avez <strong>3 semaines</strong> entre le début
                      détectable d&apos;une vague et son pic pour préparer les équipes.
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5" />
                  Seuils d&apos;Hospitalisation Paris
                </CardTitle>
                <CardDescription>
                  Basés sur les données COVID 2020-2023
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm">Baseline quotidien</span>
                  <span className="font-bold text-green-700">
                    {components.crisis_response.metrics.baseline_daily}/jour
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm">Seuil de crise (P95)</span>
                  <span className="font-bold text-orange-700">
                    {components.crisis_response.metrics.crisis_threshold_p95}/jour
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm">Maximum historique</span>
                  <span className="font-bold text-red-700">
                    {components.crisis_response.metrics.max_observed}/jour
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  Semaines à Risque (Vigilance Renforcée)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {components.grippe_seasonality.vigilance_weeks.map((week) => (
                    <Badge
                      key={week}
                      variant="outline"
                      className="bg-yellow-50 text-yellow-800 border-yellow-300"
                    >
                      Semaine {week}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Ces semaines présentent historiquement une activité grippale supérieure
                  à la normale. Il est recommandé de renforcer la surveillance et de
                  préparer les équipes en amont.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
