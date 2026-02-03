'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Euro,
  Users,
  Bed,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  Calendar,
  Target,
  Award,
  BarChart3,
} from 'lucide-react';

interface ExecutiveSummaryProps {
  currentPeriod: {
    admissions: number;
    occupancyRate: number;
    avgStayDuration: number;
    totalRevenue: number;
    personnelCost: number;
    avgWaitTime: number; // minutes
  };
  previousPeriod: {
    admissions: number;
    occupancyRate: number;
    avgStayDuration: number;
    totalRevenue: number;
    personnelCost: number;
    avgWaitTime: number;
  };
  predictions: {
    nextWeekAdmissions: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
  };
  toolROI: {
    savingsFromPredictions: number;
    interimCostAvoided: number;
    efficiencyGain: number; // %
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function getVariation(current: number, previous: number): { value: number; trend: 'up' | 'down' | 'stable' } {
  const variation = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(variation),
    trend: variation > 1 ? 'up' : variation < -1 ? 'down' : 'stable',
  };
}

function TrendIcon({ trend, positive }: { trend: 'up' | 'down' | 'stable'; positive?: boolean }) {
  const isGood = positive ? trend === 'up' : trend === 'down';
  const isBad = positive ? trend === 'down' : trend === 'up';
  
  if (trend === 'stable') return <Minus className="h-4 w-4 text-gray-500" />;
  if (trend === 'up') {
    return <TrendingUp className={`h-4 w-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />;
  }
  return <TrendingDown className={`h-4 w-4 ${isBad ? 'text-red-500' : 'text-green-500'}`} />;
}

export function ExecutiveSummary({ 
  currentPeriod, 
  previousPeriod, 
  predictions,
  toolROI 
}: ExecutiveSummaryProps) {
  const admissionsVar = getVariation(currentPeriod.admissions, previousPeriod.admissions);
  const occupancyVar = getVariation(currentPeriod.occupancyRate, previousPeriod.occupancyRate);
  const stayVar = getVariation(currentPeriod.avgStayDuration, previousPeriod.avgStayDuration);
  const revenueVar = getVariation(currentPeriod.totalRevenue, previousPeriod.totalRevenue);
  const waitTimeVar = getVariation(currentPeriod.avgWaitTime, previousPeriod.avgWaitTime);

  const handleExportPDF = () => {
    // Simulation d'export PDF
    alert('Export PDF en cours de génération...\n\nCette fonctionnalité générerait un rapport PDF incluant:\n- Synthèse exécutive\n- KPIs clés\n- Comparaison N/N-1\n- Prévisions\n- Recommandations');
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec date et actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Synthèse Direction
          </h2>
          <p className="text-muted-foreground">
            Période: {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button onClick={handleExportPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Exporter PDF
        </Button>
      </div>

      {/* KPIs principaux avec comparaison N-1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div className="flex items-center gap-1 text-sm">
                <TrendIcon trend={admissionsVar.trend} positive />
                <span className={admissionsVar.trend === 'up' ? 'text-green-600' : admissionsVar.trend === 'down' ? 'text-red-600' : ''}>
                  {admissionsVar.value.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold">{formatNumber(currentPeriod.admissions)}</p>
            <p className="text-xs text-muted-foreground">Admissions (vs {formatNumber(previousPeriod.admissions)} N-1)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Bed className="h-5 w-5 text-orange-500" />
              <div className="flex items-center gap-1 text-sm">
                <TrendIcon trend={occupancyVar.trend} />
                <span>{occupancyVar.value.toFixed(1)}%</span>
              </div>
            </div>
            <p className="text-2xl font-bold">{currentPeriod.occupancyRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Taux occupation (vs {previousPeriod.occupancyRate.toFixed(1)}%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div className="flex items-center gap-1 text-sm">
                <TrendIcon trend={waitTimeVar.trend} />
                <span>{waitTimeVar.value.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-2xl font-bold">{currentPeriod.avgWaitTime} min</p>
            <p className="text-xs text-muted-foreground">Attente urgences (vs {previousPeriod.avgWaitTime} min)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-cyan-500" />
              <div className="flex items-center gap-1 text-sm">
                <TrendIcon trend={stayVar.trend} />
                <span>{stayVar.value.toFixed(1)}%</span>
              </div>
            </div>
            <p className="text-2xl font-bold">{currentPeriod.avgStayDuration.toFixed(1)}j</p>
            <p className="text-xs text-muted-foreground">DMS (vs {previousPeriod.avgStayDuration.toFixed(1)}j)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Euro className="h-5 w-5 text-green-500" />
              <div className="flex items-center gap-1 text-sm">
                <TrendIcon trend={revenueVar.trend} positive />
                <span className={revenueVar.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {revenueVar.value.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(currentPeriod.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Recettes (vs {formatCurrency(previousPeriod.totalRevenue)})</p>
          </CardContent>
        </Card>
      </div>

      {/* ROI de l'outil prédictif */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <Award className="h-5 w-5" />
            ROI de l'Outil Prédictif - Ce Mois
          </CardTitle>
          <CardDescription>
            Économies et gains d'efficience générés grâce aux prédictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white/60 rounded-lg">
              <p className="text-3xl font-bold text-emerald-700">
                {formatCurrency(toolROI.savingsFromPredictions)}
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                Économies totales
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Grâce à l'anticipation des pics
              </p>
            </div>
            <div className="text-center p-4 bg-white/60 rounded-lg">
              <p className="text-3xl font-bold text-emerald-700">
                {formatCurrency(toolROI.interimCostAvoided)}
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                Intérim évité
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Mobilisation pool interne en amont
              </p>
            </div>
            <div className="text-center p-4 bg-white/60 rounded-lg">
              <p className="text-3xl font-bold text-emerald-700">
                +{toolROI.efficiencyGain}%
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                Gain d'efficience
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Meilleure allocation ressources
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white/80 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-700 font-medium">
                ROI annualisé estimé
              </span>
              <span className="text-emerald-800 font-bold text-lg">
                {formatCurrency(toolROI.savingsFromPredictions * 12)}
              </span>
            </div>
            <Progress value={Math.min(100, (toolROI.savingsFromPredictions * 12) / 500000 * 100)} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Objectif: 500 000 € d'économies annuelles
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prévisions et alertes */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5" />
              Prévision Semaine Prochaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold">{formatNumber(predictions.nextWeekAdmissions)}</p>
                <p className="text-sm text-muted-foreground">admissions prévues</p>
              </div>
              <Badge 
                variant={predictions.trend === 'up' ? 'destructive' : predictions.trend === 'down' ? 'default' : 'secondary'}
                className="text-lg px-3 py-1"
              >
                {predictions.trend === 'up' ? '↑' : predictions.trend === 'down' ? '↓' : '→'}
                {predictions.trend === 'up' ? ' Hausse' : predictions.trend === 'down' ? ' Baisse' : ' Stable'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Confiance:</span>
              <Progress value={predictions.confidence} className="flex-1 h-2" />
              <span className="text-sm font-medium">{predictions.confidence}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5" />
              Points d'Attention Direction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentPeriod.occupancyRate > 85 && (
              <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">Taux d'occupation élevé</p>
                  <p className="text-red-600">Risque de saturation à court terme</p>
                </div>
              </div>
            )}
            {waitTimeVar.trend === 'up' && waitTimeVar.value > 10 && (
              <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                <Clock className="h-4 w-4 text-orange-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">Temps d'attente en hausse</p>
                  <p className="text-orange-600">+{waitTimeVar.value.toFixed(0)}% vs période précédente</p>
                </div>
              </div>
            )}
            {predictions.trend === 'up' && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Hausse d'activité prévue</p>
                  <p className="text-blue-600">Anticiper le renforcement des équipes</p>
                </div>
              </div>
            )}
            {currentPeriod.occupancyRate <= 85 && predictions.trend !== 'up' && (
              <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-800">Situation maîtrisée</p>
                  <p className="text-green-600">Indicateurs dans les normes</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Composant avec données par défaut pour la démo
export function ExecutiveSummaryDemo() {
  const [data, setData] = useState<{
    current: ExecutiveSummaryProps['currentPeriod'];
    previous: ExecutiveSummaryProps['previousPeriod'];
  } | null>(null);

  useEffect(() => {
    // Charger les vraies données
    Promise.all([
      fetch('/api/kpis').then(r => r.json()),
      fetch('/api/stats?type=monthly').then(r => r.json()),
    ]).then(([kpis, stats]) => {
      // Construire les données à partir des vraies stats
      const monthlyData = stats.monthly || [];
      const currentMonth = monthlyData[monthlyData.length - 1] || {};
      const previousYearMonth = monthlyData.find((m: any) => 
        m.annee === currentMonth.annee - 1 && m.mois === currentMonth.mois
      ) || monthlyData[0] || {};

      setData({
        current: {
          admissions: currentMonth.total_admissions || 11200,
          occupancyRate: kpis.taux_occupation_moyen || 72,
          avgStayDuration: currentMonth.duree_moyenne || 4.2,
          totalRevenue: (currentMonth.cout_total || 68000000),
          personnelCost: (currentMonth.cout_total || 68000000) * 0.7,
          avgWaitTime: 45,
        },
        previous: {
          admissions: previousYearMonth.total_admissions || 10800,
          occupancyRate: 68,
          avgStayDuration: previousYearMonth.duree_moyenne || 4.5,
          totalRevenue: (previousYearMonth.cout_total || 65000000),
          personnelCost: (previousYearMonth.cout_total || 65000000) * 0.7,
          avgWaitTime: 52,
        },
      });
    }).catch(() => {
      // Données par défaut si erreur
      setData({
        current: {
          admissions: 11247,
          occupancyRate: 72.3,
          avgStayDuration: 4.2,
          totalRevenue: 69400000,
          personnelCost: 48580000,
          avgWaitTime: 45,
        },
        previous: {
          admissions: 10832,
          occupancyRate: 68.5,
          avgStayDuration: 4.5,
          totalRevenue: 65200000,
          personnelCost: 45640000,
          avgWaitTime: 52,
        },
      });
    });
  }, []);

  if (!data) return null;

  return (
    <ExecutiveSummary
      currentPeriod={data.current}
      previousPeriod={data.previous}
      predictions={{
        nextWeekAdmissions: Math.round(data.current.admissions / 4 * 1.05),
        confidence: 87,
        trend: 'up',
      }}
      toolROI={{
        savingsFromPredictions: 42500,
        interimCostAvoided: 28000,
        efficiencyGain: 12,
      }}
    />
  );
}
