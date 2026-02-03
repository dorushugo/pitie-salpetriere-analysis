'use client';

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { SimulationResults } from '@/components/simulation/simulation-results';
import {
  Bug,
  Users,
  Siren,
  CalendarDays,
  Thermometer,
  Play,
  Loader2,
  Info,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import type { SimulationResult, ScenarioType, ServiceType } from '@/lib/types';

const scenarios = [
  {
    type: 'epidemie' as ScenarioType,
    name: 'Épidémie',
    description: 'Grippe, COVID ou autre maladie contagieuse',
    icon: Bug,
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    defaultDuree: 14,
    defaultIntensite: 0.7,
    servicesAffectes: ['Urgences', 'Maladies Infectieuses', 'Pédiatrie'] as ServiceType[],
    impacts: ['Saturation urgences', 'Risque contamination', 'Besoin isolement'],
  },
  {
    type: 'greve' as ScenarioType,
    name: 'Grève du Personnel',
    description: 'Réduction de la capacité de prise en charge',
    icon: Users,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    defaultDuree: 5,
    defaultIntensite: 0.5,
    servicesAffectes: ['Urgences', 'Cardiologie', 'Neurologie', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation'] as ServiceType[],
    impacts: ['Sous-effectif', 'Report de soins', 'Service minimum'],
  },
  {
    type: 'afflux_massif' as ScenarioType,
    name: 'Afflux Massif',
    description: 'Accident de grande ampleur ou attentat',
    icon: Siren,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    defaultDuree: 3,
    defaultIntensite: 1.0,
    servicesAffectes: ['Urgences', 'Réanimation'] as ServiceType[],
    impacts: ['Plan blanc', 'Tri des victimes', 'Transferts massifs'],
  },
  {
    type: 'pic_saisonnier' as ScenarioType,
    name: 'Pic Saisonnier',
    description: 'Augmentation cyclique liée à la saison',
    icon: CalendarDays,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    defaultDuree: 21,
    defaultIntensite: 0.5,
    servicesAffectes: ['Urgences', 'Cardiologie', 'Maladies Infectieuses'] as ServiceType[],
    impacts: ['Surcharge progressive', 'Allongement délais', 'Fatigue équipes'],
  },
  {
    type: 'canicule' as ScenarioType,
    name: 'Canicule',
    description: 'Vague de chaleur intense',
    icon: Thermometer,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    defaultDuree: 10,
    defaultIntensite: 0.6,
    servicesAffectes: ['Urgences', 'Cardiologie', 'Neurologie'] as ServiceType[],
    impacts: ['Déshydratation', 'Coups de chaleur', 'Surcharge cardiologie'],
  },
];

export default function SimulationsPage() {
  const [selectedScenario, setSelectedScenario] = useState<typeof scenarios[0] | null>(null);
  const [duree, setDuree] = useState(7);
  const [intensite, setIntensite] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const handleSelectScenario = (scenario: typeof scenarios[0]) => {
    setSelectedScenario(scenario);
    setDuree(scenario.defaultDuree);
    setIntensite(scenario.defaultIntensite);
    setSimulationResult(null);
  };

  const handleSimulate = async () => {
    if (!selectedScenario) return;

    setLoading(true);
    try {
      const response = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedScenario.type,
          duree_jours: duree,
          intensite,
          services_affectes: selectedScenario.servicesAffectes,
        }),
      });

      const result = await response.json();
      setSimulationResult(result);
    } catch (error) {
      console.error('Erreur simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Simulations de Scénarios"
      description="Testez différents scénarios de crise et visualisez leur impact sur l'hôpital"
    >
      <div className="space-y-6">
        {/* Introduction */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Info className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-indigo-900">Comment ça marche ?</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Sélectionnez un type de scénario, ajustez les paramètres (durée et intensité), 
                  puis lancez la simulation pour voir les prédictions d'impact et les recommandations associées.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grille de scénarios */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Choisir un type de scénario
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              const isSelected = selectedScenario?.type === scenario.type;

              return (
                <button
                  key={scenario.type}
                  onClick={() => handleSelectScenario(scenario)}
                  className={`relative p-5 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    isSelected
                      ? `${scenario.lightColor} ${scenario.borderColor} shadow-md`
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`inline-flex p-2.5 rounded-lg ${scenario.color} mb-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className={`font-semibold ${isSelected ? scenario.textColor : 'text-gray-900'}`}>
                    {scenario.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {scenario.description}
                  </p>
                  {isSelected && (
                    <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${scenario.color}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paramètres et résultats */}
        {selectedScenario && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Paramètres */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedScenario.color}`}>
                    {(() => {
                      const Icon = selectedScenario.icon;
                      return <Icon className="h-5 w-5 text-white" />;
                    })()}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedScenario.name}</CardTitle>
                    <CardDescription>Configurer le scénario</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Durée */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Durée de la crise
                    </label>
                    <Badge variant="secondary">{duree} jours</Badge>
                  </div>
                  <Slider
                    value={[duree]}
                    onValueChange={(v) => setDuree(v[0])}
                    min={1}
                    max={30}
                    step={1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 jour</span>
                    <span>30 jours</span>
                  </div>
                </div>

                {/* Intensité */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Intensité
                    </label>
                    <Badge 
                      variant="secondary"
                      className={
                        intensite > 0.7 ? 'bg-red-100 text-red-700' :
                        intensite > 0.4 ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }
                    >
                      {intensite <= 0.3 ? 'Faible' : intensite <= 0.6 ? 'Modérée' : intensite <= 0.8 ? 'Forte' : 'Extrême'}
                    </Badge>
                  </div>
                  <Slider
                    value={[intensite * 100]}
                    onValueChange={(v) => setIntensite(v[0] / 100)}
                    min={10}
                    max={100}
                    step={10}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Faible</span>
                    <span>Extrême</span>
                  </div>
                </div>

                {/* Services affectés */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Services principalement affectés
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedScenario.servicesAffectes.map((service) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Impacts attendus */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Impacts attendus
                  </label>
                  <div className="space-y-1.5">
                    {selectedScenario.impacts.map((impact) => (
                      <div key={impact} className="flex items-center gap-2 text-sm text-gray-600">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        {impact}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bouton simuler */}
                <Button
                  onClick={handleSimulate}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Simulation en cours...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Lancer la simulation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Résultats */}
            <div className="lg:col-span-2">
              {simulationResult ? (
                <SimulationResults result={simulationResult} />
              ) : (
                <Card className="h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Prêt à simuler
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Configurez les paramètres du scénario <strong>{selectedScenario.name}</strong> puis 
                      cliquez sur "Lancer la simulation" pour voir les résultats.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* État initial - aucun scénario sélectionné */}
        {!selectedScenario && (
          <Card className="py-16">
            <CardContent>
              <div className="text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="h-10 w-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sélectionnez un scénario ci-dessus
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Choisissez parmi les 5 types de scénarios de crise pour simuler 
                  leur impact sur l'hôpital et obtenir des recommandations adaptées.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
