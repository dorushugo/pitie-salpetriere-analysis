'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Euro,
  Calculator,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building,
  Briefcase,
  UserPlus,
} from 'lucide-react';

interface SimulationResult {
  scenario: string;
  annualCost: number;
  coverageHours: number;
  flexibility: number; // 1-10
  qualityImpact: number; // -10 à +10
  timeToImplement: string;
  risks: string[];
  benefits: string[];
}

// Coûts de référence (données réalistes secteur hospitalier France)
const COSTS = {
  IDE_ANNUAL_SALARY: 35000, // Salaire brut chargé IDE
  IDE_INTERIM_HOURLY: 45, // Taux horaire intérim IDE
  AS_ANNUAL_SALARY: 28000, // Aide-soignant
  AS_INTERIM_HOURLY: 32,
  MEDECIN_ANNUAL_SALARY: 85000,
  MEDECIN_INTERIM_DAILY: 800,
  RECRUITMENT_COST: 5000, // Coût de recrutement (annonces, temps RH, etc.)
  TRAINING_COST: 3000, // Coût de formation initiale
  HOURS_PER_YEAR: 1607, // Heures travaillées par an (35h)
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function HRSimulator() {
  const [staffType, setStaffType] = useState<'ide' | 'as' | 'medecin'>('ide');
  const [needType, setNeedType] = useState<'permanent' | 'temporary'>('permanent');
  const [quantity, setQuantity] = useState(3);
  const [duration, setDuration] = useState(12); // mois
  const [results, setResults] = useState<SimulationResult[] | null>(null);

  const staffLabels = {
    ide: 'Infirmier(e) IDE',
    as: 'Aide-soignant(e)',
    medecin: 'Médecin',
  };

  const calculateScenarios = () => {
    const annualSalary = staffType === 'ide' ? COSTS.IDE_ANNUAL_SALARY 
      : staffType === 'as' ? COSTS.AS_ANNUAL_SALARY 
      : COSTS.MEDECIN_ANNUAL_SALARY;
    
    const interimRate = staffType === 'ide' ? COSTS.IDE_INTERIM_HOURLY
      : staffType === 'as' ? COSTS.AS_INTERIM_HOURLY
      : COSTS.MEDECIN_INTERIM_DAILY / 10; // ~10h/jour

    const hoursNeeded = COSTS.HOURS_PER_YEAR * (duration / 12);

    // Scénario 1: Recrutement CDI
    const recruitmentScenario: SimulationResult = {
      scenario: 'Recrutement CDI',
      annualCost: (annualSalary * quantity * (duration / 12)) + (COSTS.RECRUITMENT_COST + COSTS.TRAINING_COST) * quantity,
      coverageHours: hoursNeeded * quantity,
      flexibility: 3,
      qualityImpact: 8,
      timeToImplement: '2-4 mois',
      risks: [
        'Délai de recrutement',
        'Risque de départ en période d\'essai',
        'Engagement sur le long terme',
      ],
      benefits: [
        'Stabilité des équipes',
        'Meilleure connaissance des patients',
        'Coût unitaire le plus bas à long terme',
        'Fidélisation et formation continue',
      ],
    };

    // Scénario 2: Intérim 100%
    const interimScenario: SimulationResult = {
      scenario: 'Intérim 100%',
      annualCost: interimRate * hoursNeeded * quantity,
      coverageHours: hoursNeeded * quantity,
      flexibility: 9,
      qualityImpact: -2,
      timeToImplement: '24-48h',
      risks: [
        'Coût élevé (+50-80% vs CDI)',
        'Turn-over fréquent',
        'Moindre connaissance des protocoles',
        'Disponibilité variable',
      ],
      benefits: [
        'Flexibilité maximale',
        'Pas d\'engagement',
        'Réponse rapide aux besoins',
        'Gestion simplifiée',
      ],
    };

    // Scénario 3: Mix CDI + Pool interne + Intérim ponctuel
    const mixRatio = { cdi: 0.6, pool: 0.25, interim: 0.15 };
    const mixScenario: SimulationResult = {
      scenario: 'Mix optimisé',
      annualCost: 
        (annualSalary * quantity * mixRatio.cdi * (duration / 12)) + // CDI
        (annualSalary * 1.1 * quantity * mixRatio.pool * (duration / 12)) + // Pool (légère prime)
        (interimRate * hoursNeeded * quantity * mixRatio.interim), // Intérim
      coverageHours: hoursNeeded * quantity,
      flexibility: 7,
      qualityImpact: 5,
      timeToImplement: '1-2 mois',
      risks: [
        'Gestion plus complexe',
        'Coordination nécessaire',
      ],
      benefits: [
        'Équilibre coût/flexibilité',
        'Noyau stable + ajustements',
        'Résilience aux absences',
        'Optimisation budgétaire',
      ],
    };

    // Scénario 4: Heures supplémentaires équipe existante
    const overtimeScenario: SimulationResult = {
      scenario: 'Heures supplémentaires',
      annualCost: annualSalary * 0.25 * quantity * (duration / 12) * 1.5, // Majorées 50%
      coverageHours: hoursNeeded * quantity * 0.3, // Limité à 30% du besoin
      flexibility: 5,
      qualityImpact: -3,
      timeToImplement: 'Immédiat',
      risks: [
        'Couverture partielle seulement',
        'Épuisement des équipes',
        'Risque d\'arrêts maladie',
        'Limité légalement (220h/an)',
      ],
      benefits: [
        'Coût intermédiaire',
        'Équipe connue',
        'Mise en œuvre rapide',
      ],
    };

    setResults([recruitmentScenario, mixScenario, interimScenario, overtimeScenario]);
  };

  const getBestOption = () => {
    if (!results) return null;
    if (needType === 'permanent') {
      return results.find(r => r.scenario === 'Recrutement CDI');
    } else if (duration <= 3) {
      return results.find(r => r.scenario === 'Intérim 100%');
    } else {
      return results.find(r => r.scenario === 'Mix optimisé');
    }
  };

  const bestOption = getBestOption();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulateur RH - Analyse Coût/Bénéfice
          </CardTitle>
          <CardDescription>
            Comparez les options de staffing pour optimiser vos décisions RH
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paramètres */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type de personnel</label>
                <Tabs value={staffType} onValueChange={(v) => setStaffType(v as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="ide">IDE</TabsTrigger>
                    <TabsTrigger value="as">AS</TabsTrigger>
                    <TabsTrigger value="medecin">Médecin</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Nature du besoin</label>
                <Tabs value={needType} onValueChange={(v) => setNeedType(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="permanent">Permanent</TabsTrigger>
                    <TabsTrigger value="temporary">Temporaire</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">Nombre d'ETP</label>
                  <span className="text-sm font-bold">{quantity}</span>
                </div>
                <Slider
                  value={[quantity]}
                  onValueChange={(v) => setQuantity(v[0])}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">Durée (mois)</label>
                  <span className="text-sm font-bold">{duration} mois</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={(v) => setDuration(v[0])}
                  min={1}
                  max={24}
                  step={1}
                />
              </div>
            </div>
          </div>

          <Button onClick={calculateScenarios} className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            Simuler les scénarios
          </Button>
        </CardContent>
      </Card>

      {/* Résultats */}
      {results && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {results.map((result, idx) => {
              const isBest = bestOption?.scenario === result.scenario;
              return (
                <Card 
                  key={idx} 
                  className={`relative ${isBest ? 'ring-2 ring-green-500 bg-green-50/50' : ''}`}
                >
                  {isBest && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500">
                      Recommandé
                    </Badge>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {result.scenario === 'Recrutement CDI' && <UserPlus className="h-4 w-4" />}
                      {result.scenario === 'Intérim 100%' && <Briefcase className="h-4 w-4" />}
                      {result.scenario === 'Mix optimisé' && <Users className="h-4 w-4" />}
                      {result.scenario === 'Heures supplémentaires' && <Clock className="h-4 w-4" />}
                      {result.scenario}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center py-2 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(result.annualCost)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Coût total sur {duration} mois
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flexibilité</span>
                        <div className="flex gap-0.5">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < result.flexibility ? 'bg-blue-500' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Impact qualité</span>
                        <Badge variant={result.qualityImpact >= 0 ? 'default' : 'destructive'}>
                          {result.qualityImpact >= 0 ? '+' : ''}{result.qualityImpact}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Délai</span>
                        <span className="font-medium">{result.timeToImplement}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Détails du meilleur scénario */}
          {bestOption && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  Recommandation: {bestOption.scenario}
                </CardTitle>
                <CardDescription>
                  Pour {quantity} {staffLabels[staffType]}(s) sur {duration} mois
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Avantages
                    </h4>
                    <ul className="space-y-1">
                      {bestOption.benefits.map((b, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Points de vigilance
                    </h4>
                    <ul className="space-y-1">
                      {bestOption.risks.map((r, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-orange-500 mt-1">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white/60 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Économie vs intérim pur:</strong>{' '}
                    {formatCurrency(
                      (results.find(r => r.scenario === 'Intérim 100%')?.annualCost || 0) - bestOption.annualCost
                    )}
                    {' '}soit{' '}
                    {(
                      ((results.find(r => r.scenario === 'Intérim 100%')?.annualCost || 0) - bestOption.annualCost) /
                      (results.find(r => r.scenario === 'Intérim 100%')?.annualCost || 1) * 100
                    ).toFixed(0)}% d'économie
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparaison mensuelle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coût mensuel comparé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.sort((a, b) => a.annualCost - b.annualCost).map((result, idx) => {
                  const monthlyCoat = result.annualCost / duration;
                  const maxCost = Math.max(...results.map(r => r.annualCost / duration));
                  const percentage = (monthlyCoat / maxCost) * 100;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{result.scenario}</span>
                        <span className="font-medium">{formatCurrency(monthlyCoat)}/mois</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            idx === 0 ? 'bg-green-500' : idx === results.length - 1 ? 'bg-red-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
