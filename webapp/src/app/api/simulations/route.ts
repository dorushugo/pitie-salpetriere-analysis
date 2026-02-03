import { NextRequest, NextResponse } from 'next/server';
import { getDailyStats } from '@/lib/data';
import { simulateScenario } from '@/lib/calculations';
import type { ScenarioParams, ServiceType } from '@/lib/types';

const ALL_SERVICES: ServiceType[] = [
  'Urgences',
  'Cardiologie',
  'Neurologie',
  'Maladies Infectieuses',
  'Pédiatrie',
  'Réanimation',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Valider les paramètres
    const scenario: ScenarioParams = {
      type: body.type || 'epidemie',
      duree_jours: Math.min(Math.max(body.duree_jours || 14, 1), 90),
      intensite: Math.min(Math.max(body.intensite || 1, 0.1), 3),
      services_affectes: body.services_affectes || getDefaultServices(body.type),
      params_specifiques: body.params_specifiques || {},
    };
    
    // Charger les données de base
    const dailyStats = await getDailyStats();
    
    // Utiliser les 30 derniers jours comme baseline
    const baselineStats = dailyStats.slice(-30);
    
    // Exécuter la simulation
    const result = simulateScenario(scenario, baselineStats);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running simulation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exécution de la simulation' },
      { status: 500 }
    );
  }
}

function getDefaultServices(type: string): ServiceType[] {
  switch (type) {
    case 'epidemie':
      return ['Urgences', 'Maladies Infectieuses', 'Pédiatrie'];
    case 'greve':
      return ALL_SERVICES;
    case 'afflux_massif':
      return ['Urgences', 'Réanimation'];
    case 'pic_saisonnier':
      return ['Urgences', 'Cardiologie', 'Maladies Infectieuses'];
    case 'canicule':
      return ['Urgences', 'Cardiologie', 'Neurologie'];
    default:
      return ['Urgences'];
  }
}

// GET pour récupérer les types de scénarios disponibles
export async function GET() {
  return NextResponse.json({
    scenarios: [
      {
        type: 'epidemie',
        nom: 'Épidémie',
        description: 'Simulation d\'une épidémie (grippe, COVID, etc.)',
        params_defaut: {
          duree_jours: 14,
          intensite: 1,
          services_affectes: ['Urgences', 'Maladies Infectieuses', 'Pédiatrie'],
        },
      },
      {
        type: 'greve',
        nom: 'Grève du Personnel',
        description: 'Simulation d\'une grève réduisant la capacité',
        params_defaut: {
          duree_jours: 3,
          intensite: 0.7,
          services_affectes: ALL_SERVICES,
        },
      },
      {
        type: 'afflux_massif',
        nom: 'Afflux Massif',
        description: 'Simulation d\'un accident ou attentat',
        params_defaut: {
          duree_jours: 3,
          intensite: 2,
          services_affectes: ['Urgences', 'Réanimation'],
        },
      },
      {
        type: 'pic_saisonnier',
        nom: 'Pic Saisonnier',
        description: 'Simulation d\'un pic d\'activité saisonnier',
        params_defaut: {
          duree_jours: 30,
          intensite: 1,
          services_affectes: ['Urgences', 'Cardiologie', 'Maladies Infectieuses'],
        },
      },
      {
        type: 'canicule',
        nom: 'Canicule',
        description: 'Simulation d\'une vague de chaleur',
        params_defaut: {
          duree_jours: 7,
          intensite: 1,
          services_affectes: ['Urgences', 'Cardiologie', 'Neurologie'],
        },
      },
    ],
    services: ALL_SERVICES,
  });
}
