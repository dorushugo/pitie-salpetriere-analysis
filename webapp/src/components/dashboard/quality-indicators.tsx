'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Award,
  ThumbsUp,
  Activity,
} from 'lucide-react';

interface QualityIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  description: string;
}

const QUALITY_INDICATORS: QualityIndicator[] = [
  {
    id: 'wait_time_urgences',
    name: 'Temps d\'attente Urgences',
    value: 45,
    unit: 'min',
    target: 30,
    trend: 'down',
    status: 'warning',
    description: 'Temps moyen avant prise en charge médicale',
  },
  {
    id: 'passage_duration',
    name: 'Durée de passage Urgences',
    value: 4.2,
    unit: 'h',
    target: 4,
    trend: 'stable',
    status: 'warning',
    description: 'Durée totale de séjour aux urgences',
  },
  {
    id: 'readmission_rate',
    name: 'Taux de réadmission 30j',
    value: 8.5,
    unit: '%',
    target: 10,
    trend: 'down',
    status: 'good',
    description: 'Patients réadmis dans les 30 jours',
  },
  {
    id: 'bed_turnaround',
    name: 'Rotation des lits',
    value: 2.1,
    unit: 'j',
    target: 2,
    trend: 'up',
    status: 'warning',
    description: 'Temps moyen entre sortie et nouvelle admission',
  },
  {
    id: 'nosocomial_rate',
    name: 'Infections nosocomiales',
    value: 3.2,
    unit: '‰',
    target: 5,
    trend: 'down',
    status: 'good',
    description: 'Pour 1000 journées d\'hospitalisation',
  },
  {
    id: 'satisfaction',
    name: 'Satisfaction patients',
    value: 78,
    unit: '%',
    target: 80,
    trend: 'up',
    status: 'warning',
    description: 'Score e-Satis (enquête sortie)',
  },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'good': return 'text-green-600 bg-green-50 border-green-200';
    case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'good': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default: return null;
  }
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
  return <span className="text-gray-400">→</span>;
}

export function QualityIndicators() {
  const [indicators, setIndicators] = useState<QualityIndicator[]>(QUALITY_INDICATORS);

  // Score global
  const goodCount = indicators.filter(i => i.status === 'good').length;
  const warningCount = indicators.filter(i => i.status === 'warning').length;
  const criticalCount = indicators.filter(i => i.status === 'critical').length;
  const globalScore = Math.round((goodCount * 100 + warningCount * 50 + criticalCount * 0) / indicators.length);

  return (
    <div className="space-y-6">
      {/* Score global */}
      <Card className={`${
        globalScore >= 80 ? 'bg-green-50 border-green-200' :
        globalScore >= 60 ? 'bg-orange-50 border-orange-200' :
        'bg-red-50 border-red-200'
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Score Qualité Global
            </CardTitle>
            <Badge variant={globalScore >= 80 ? 'default' : globalScore >= 60 ? 'secondary' : 'destructive'}>
              {goodCount} sur objectif / {indicators.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{globalScore}%</div>
            <div className="flex-1">
              <Progress value={globalScore} className="h-3" />
            </div>
          </div>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>{goodCount} conformes</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>{warningCount} à surveiller</span>
            </div>
            {criticalCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>{criticalCount} critiques</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Indicateurs détaillés */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((indicator) => {
          const progressValue = indicator.target > indicator.value 
            ? (indicator.value / indicator.target) * 100
            : (indicator.target / indicator.value) * 100;
          const isInverse = ['wait_time_urgences', 'passage_duration', 'bed_turnaround', 'nosocomial_rate'].includes(indicator.id);
          
          return (
            <Card key={indicator.id} className={`border ${getStatusColor(indicator.status)}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{indicator.name}</CardTitle>
                  {getStatusIcon(indicator.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold">{indicator.value}</span>
                  <span className="text-sm text-muted-foreground">{indicator.unit}</span>
                  <div className={`flex items-center gap-1 text-sm ${
                    (indicator.trend === 'down' && isInverse) || (indicator.trend === 'up' && !isInverse)
                      ? 'text-green-600'
                      : (indicator.trend === 'up' && isInverse) || (indicator.trend === 'down' && !isInverse)
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}>
                    <TrendIcon trend={indicator.trend} />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Objectif: {indicator.target} {indicator.unit}</span>
                    <span>{Math.round(progressValue)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(100, progressValue)} 
                    className={`h-1.5 ${indicator.status === 'good' ? '[&>div]:bg-green-500' : indicator.status === 'warning' ? '[&>div]:bg-orange-500' : '[&>div]:bg-red-500'}`}
                  />
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  {indicator.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recommandations qualité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Actions d'Amélioration Qualité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {indicators.filter(i => i.status !== 'good').map((indicator) => (
            <div key={indicator.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${indicator.status === 'critical' ? 'text-red-500' : 'text-orange-500'}`} />
              <div className="flex-1">
                <p className="font-medium text-sm">{indicator.name}</p>
                <p className="text-sm text-muted-foreground">
                  {indicator.id === 'wait_time_urgences' && (
                    <>Réduire de {indicator.value - indicator.target} min → Renforcer triage, ajouter 1 médecin urgentiste aux heures de pointe</>
                  )}
                  {indicator.id === 'passage_duration' && (
                    <>Optimiser les sorties → Améliorer coordination avec services d'aval, circuit rapide pour petite traumato</>
                  )}
                  {indicator.id === 'bed_turnaround' && (
                    <>Accélérer la rotation → Process de nettoyage accéléré, anticipation sorties J-1</>
                  )}
                  {indicator.id === 'satisfaction' && (
                    <>+{indicator.target - indicator.value} points → Améliorer communication, réduire temps d'attente, confort des locaux</>
                  )}
                </p>
              </div>
              <Badge variant="outline">
                Écart: {indicator.id.includes('rate') || indicator.id === 'satisfaction' 
                  ? `${(indicator.target - indicator.value).toFixed(1)}${indicator.unit}`
                  : `+${(indicator.value - indicator.target).toFixed(1)}${indicator.unit}`}
              </Badge>
            </div>
          ))}
          
          {indicators.every(i => i.status === 'good') && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <ThumbsUp className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium text-green-800">Tous les indicateurs sont conformes</p>
                <p className="text-sm text-green-600">Maintenir la vigilance et les bonnes pratiques</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
