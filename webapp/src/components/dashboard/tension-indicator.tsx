'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Users,
  BedDouble,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

type TensionLevel = 'normal' | 'vigilance' | 'tension' | 'saturation';

type ServiceTension = {
  service: string;
  tauxOccupation: number;
  tendance: 'hausse' | 'stable' | 'baisse';
  tempsAttente?: number;
};

type TensionIndicatorProps = {
  tauxOccupationGlobal: number;
  personnelDisponible: number;
  personnelRequis: number;
  servicesTension: ServiceTension[];
  predictedPeak?: {
    date: string;
    variation: number;
  };
};

const tensionConfig = {
  normal: {
    level: 'Normal',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    description: 'Activité normale. Pas d\'action urgente requise.',
  },
  vigilance: {
    level: 'Vigilance',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: AlertCircle,
    description: 'Surveillance accrue. Préparer les ressources de réserve.',
  },
  tension: {
    level: 'Tension',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
    description: 'Activation du protocole de tension. Renforcer les équipes.',
  },
  saturation: {
    level: 'Saturation',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
    description: 'Plan blanc potentiel. Mesures exceptionnelles requises.',
  },
};

function calculateTensionLevel(
  tauxOccupation: number,
  ratioPersonnel: number
): TensionLevel {
  if (tauxOccupation >= 95 || ratioPersonnel < 0.7) return 'saturation';
  if (tauxOccupation >= 85 || ratioPersonnel < 0.8) return 'tension';
  if (tauxOccupation >= 75 || ratioPersonnel < 0.9) return 'vigilance';
  return 'normal';
}

export function TensionIndicator({
  tauxOccupationGlobal,
  personnelDisponible,
  personnelRequis,
  servicesTension,
  predictedPeak,
}: TensionIndicatorProps) {
  const ratioPersonnel = personnelDisponible / personnelRequis;
  const tensionLevel = calculateTensionLevel(tauxOccupationGlobal, ratioPersonnel);
  const config = tensionConfig[tensionLevel];
  const TensionIcon = config.icon;

  // Services en difficulté
  const servicesEnDifficulte = servicesTension.filter(s => s.tauxOccupation > 80);

  return (
    <Card className={`border-2 ${config.borderColor}`}>
      <CardHeader className={config.bgColor}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${config.color}`}>
              <TensionIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Niveau de Tension Hospitalière
                <Badge className={`${config.color} text-white`}>
                  {config.level}
                </Badge>
              </CardTitle>
              <p className={`text-sm mt-1 ${config.textColor}`}>
                {config.description}
              </p>
            </div>
          </div>
          <Activity className={`h-8 w-8 ${config.textColor}`} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Indicateurs principaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Taux d'occupation */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BedDouble className="h-4 w-4" />
              Occupation
            </div>
            <div className="text-2xl font-bold">{tauxOccupationGlobal}%</div>
            <Progress 
              value={tauxOccupationGlobal} 
              className={`h-2 ${tauxOccupationGlobal > 85 ? '[&>div]:bg-orange-500' : tauxOccupationGlobal > 75 ? '[&>div]:bg-yellow-500' : ''}`}
            />
          </div>

          {/* Personnel */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Personnel (ETP)
            </div>
            <div className="text-2xl font-bold">
              {Math.round(personnelDisponible)}/{Math.round(personnelRequis)}
            </div>
            <Progress 
              value={ratioPersonnel * 100} 
              className={`h-2 ${ratioPersonnel < 0.8 ? '[&>div]:bg-orange-500' : ratioPersonnel < 0.9 ? '[&>div]:bg-yellow-500' : ''}`}
            />
          </div>

          {/* Services en tension */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Services tendus
            </div>
            <div className="text-2xl font-bold">
              {servicesEnDifficulte.length}/{servicesTension.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {servicesEnDifficulte.length > 0 
                ? servicesEnDifficulte.map(s => s.service).join(', ')
                : 'Aucun service en tension'
              }
            </div>
          </div>

          {/* Prévision */}
          {predictedPeak && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Pic prévu
              </div>
              <div className="text-2xl font-bold flex items-center gap-1">
                {predictedPeak.variation > 0 ? (
                  <TrendingUp className="h-5 w-5 text-red-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-green-500" />
                )}
                {predictedPeak.variation > 0 ? '+' : ''}{predictedPeak.variation}%
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(predictedPeak.date).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            </div>
          )}
        </div>

        {/* Détail par service */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">État des services</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {servicesTension.map((service) => {
              const isStressed = service.tauxOccupation > 80;
              return (
                <div
                  key={service.service}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    isStressed ? 'bg-orange-50' : 'bg-gray-50'
                  }`}
                >
                  <span className="font-medium truncate">{service.service}</span>
                  <div className="flex items-center gap-1">
                    <span className={isStressed ? 'text-orange-600 font-bold' : ''}>
                      {service.tauxOccupation}%
                    </span>
                    {service.tendance === 'hausse' && (
                      <TrendingUp className="h-3 w-3 text-red-500" />
                    )}
                    {service.tendance === 'baisse' && (
                      <TrendingDown className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions rapides selon le niveau */}
        {tensionLevel !== 'normal' && (
          <div className={`rounded-lg p-4 ${config.bgColor} border ${config.borderColor}`}>
            <h4 className={`font-medium mb-2 ${config.textColor}`}>
              Actions immédiates recommandées
            </h4>
            <ul className={`text-sm space-y-1 ${config.textColor}`}>
              {tensionLevel === 'vigilance' && (
                <>
                  <li>• Vérifier la disponibilité du pool de remplacement</li>
                  <li>• Préparer l'activation des lits de réserve</li>
                  <li>• Informer le cadre de garde</li>
                </>
              )}
              {tensionLevel === 'tension' && (
                <>
                  <li>• Activer le protocole de tension hospitalière</li>
                  <li>• Rappeler le personnel d'astreinte</li>
                  <li>• Ouvrir les lits supplémentaires disponibles</li>
                  <li>• Reporter les interventions programmées non urgentes</li>
                </>
              )}
              {tensionLevel === 'saturation' && (
                <>
                  <li>• Alerter la direction et l'ARS</li>
                  <li>• Envisager l'activation du plan blanc</li>
                  <li>• Déployer toutes les capacités de réserve</li>
                  <li>• Coordonner les transferts inter-établissements</li>
                  <li>• Mobiliser le personnel de renfort externe</li>
                </>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
