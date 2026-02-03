'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Bug, 
  Users, 
  Siren, 
  CalendarDays, 
  Thermometer 
} from 'lucide-react';
import type { ScenarioType, ServiceType, SimulationResult } from '@/lib/types';

type ScenarioFormProps = {
  onSimulate: (result: SimulationResult) => void;
};

const SCENARIOS: {
  type: ScenarioType;
  nom: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  defaultDuree: number;
  defaultIntensity: number;
  services: ServiceType[];
}[] = [
  {
    type: 'epidemie',
    nom: 'Épidémie',
    description: 'Grippe, COVID ou autre maladie contagieuse',
    icon: <Bug className="h-5 w-5" />,
    color: 'bg-red-100 text-red-800 border-red-200',
    defaultDuree: 14,
    defaultIntensity: 1,
    services: ['Urgences', 'Maladies Infectieuses', 'Pédiatrie'],
  },
  {
    type: 'greve',
    nom: 'Grève du Personnel',
    description: 'Réduction de la capacité de prise en charge',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    defaultDuree: 3,
    defaultIntensity: 0.7,
    services: ['Urgences', 'Cardiologie', 'Neurologie', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation'],
  },
  {
    type: 'afflux_massif',
    nom: 'Afflux Massif',
    description: 'Accident de grande ampleur ou attentat',
    icon: <Siren className="h-5 w-5" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultDuree: 3,
    defaultIntensity: 2,
    services: ['Urgences', 'Réanimation'],
  },
  {
    type: 'pic_saisonnier',
    nom: 'Pic Saisonnier',
    description: 'Augmentation cyclique liée à la saison',
    icon: <CalendarDays className="h-5 w-5" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultDuree: 30,
    defaultIntensity: 1,
    services: ['Urgences', 'Cardiologie', 'Maladies Infectieuses'],
  },
  {
    type: 'canicule',
    nom: 'Canicule',
    description: 'Vague de chaleur intense',
    icon: <Thermometer className="h-5 w-5" />,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    defaultDuree: 7,
    defaultIntensity: 1,
    services: ['Urgences', 'Cardiologie', 'Neurologie'],
  },
];

const ALL_SERVICES: ServiceType[] = [
  'Urgences',
  'Cardiologie',
  'Neurologie',
  'Maladies Infectieuses',
  'Pédiatrie',
  'Réanimation',
];

export function ScenarioForm({ onSimulate }: ScenarioFormProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [duree, setDuree] = useState(14);
  const [intensite, setIntensity] = useState(1);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const scenario = SCENARIOS.find(s => s.type === selectedScenario);

  const handleScenarioSelect = (type: ScenarioType) => {
    const scenarioConfig = SCENARIOS.find(s => s.type === type);
    if (scenarioConfig) {
      setSelectedScenario(type);
      setDuree(scenarioConfig.defaultDuree);
      setIntensity(scenarioConfig.defaultIntensity);
      setServices(scenarioConfig.services);
    }
  };

  const toggleService = (service: ServiceType) => {
    setServices(prev => 
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleSimulate = async () => {
    if (!selectedScenario || services.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedScenario,
          duree_jours: duree,
          intensite: intensite,
          services_affectes: services,
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de la simulation');

      const result: SimulationResult = await response.json();
      onSimulate(result);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sélection du scénario */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Choisir un scénario</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => (
            <Card
              key={s.type}
              className={`cursor-pointer transition-all ${
                selectedScenario === s.type
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleScenarioSelect(s.type)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={`p-2 rounded-lg ${s.color}`}>
                    {s.icon}
                  </span>
                  {s.nom}
                </CardTitle>
                <CardDescription className="text-sm">
                  {s.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Paramètres du scénario */}
      {selectedScenario && (
        <Card>
          <CardHeader>
            <CardTitle>Paramètres de la simulation</CardTitle>
            <CardDescription>
              Ajustez les paramètres pour le scénario {scenario?.nom}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Durée */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Durée du scénario</Label>
                <span className="text-sm font-medium">{duree} jours</span>
              </div>
              <Slider
                value={[duree]}
                onValueChange={([value]) => setDuree(value)}
                min={1}
                max={90}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 jour</span>
                <span>90 jours</span>
              </div>
            </div>

            {/* Intensité */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Intensité</Label>
                <span className="text-sm font-medium">
                  {intensite < 1 ? `${(intensite * 100).toFixed(0)}% capacité` : `x${intensite.toFixed(1)}`}
                </span>
              </div>
              <Slider
                value={[intensite * 100]}
                onValueChange={([value]) => setIntensity(value / 100)}
                min={selectedScenario === 'greve' ? 30 : 50}
                max={selectedScenario === 'greve' ? 100 : 300}
                step={10}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{selectedScenario === 'greve' ? 'Grève forte' : 'Faible'}</span>
                <span>{selectedScenario === 'greve' ? 'Normal' : 'Très intense'}</span>
              </div>
            </div>

            {/* Services affectés */}
            <div className="space-y-2">
              <Label>Services affectés</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_SERVICES.map((service) => (
                  <Badge
                    key={service}
                    variant={services.includes(service) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleService(service)}
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Bouton simulation */}
            <Button
              onClick={handleSimulate}
              disabled={isLoading || services.length === 0}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Simulation en cours...
                </>
              ) : (
                'Lancer la simulation'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
