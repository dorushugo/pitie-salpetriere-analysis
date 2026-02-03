import type {
  ScenarioParams,
  SimulationResult,
  Recommandation,
  ServiceType,
  DailyStats,
} from './types';

// Capacités par service
const CAPACITE_LITS: Record<ServiceType, number> = {
  'Urgences': 150,
  'Cardiologie': 200,
  'Neurologie': 180,
  'Maladies Infectieuses': 120,
  'Pédiatrie': 100,
  'Réanimation': 80,
};

const PERSONNEL_BASE: Record<ServiceType, number> = {
  'Urgences': 80,
  'Cardiologie': 50,
  'Neurologie': 45,
  'Maladies Infectieuses': 40,
  'Pédiatrie': 35,
  'Réanimation': 60,
};

const COUT_MOYEN_ADMISSION = 2500;
const PERSONNEL_PAR_LIT = 0.3;

// Facteurs d'intensité par type de scénario
const FACTEURS_SCENARIO: Record<string, {
  admissions: number;
  duree_moyenne: number;
  services_principaux: ServiceType[];
}> = {
  epidemie: {
    admissions: 2.0,
    duree_moyenne: 1.3,
    services_principaux: ['Urgences', 'Maladies Infectieuses', 'Pédiatrie'],
  },
  greve: {
    admissions: 0.7, // Réduction de capacité
    duree_moyenne: 1.0,
    services_principaux: ['Urgences', 'Cardiologie', 'Neurologie', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation'],
  },
  afflux_massif: {
    admissions: 3.0,
    duree_moyenne: 1.5,
    services_principaux: ['Urgences', 'Réanimation'],
  },
  pic_saisonnier: {
    admissions: 1.4,
    duree_moyenne: 1.1,
    services_principaux: ['Urgences', 'Cardiologie', 'Maladies Infectieuses'],
  },
  canicule: {
    admissions: 1.5,
    duree_moyenne: 1.2,
    services_principaux: ['Urgences', 'Cardiologie', 'Neurologie'],
  },
};

export function simulateScenario(
  scenario: ScenarioParams,
  baselineStats: DailyStats[]
): SimulationResult {
  const facteurs = FACTEURS_SCENARIO[scenario.type];
  const projections: SimulationResult['projections'] = [];
  
  // Calculer la moyenne des admissions de base
  const avgAdmissions = baselineStats.reduce((sum, d) => sum + d.admissions, 0) / baselineStats.length;
  
  // Générer les projections pour chaque jour
  const startDate = new Date();
  let totalAdmissions = 0;
  let totalPersonnelSupp = 0;
  let totalCout = 0;
  let joursSaturation = 0;
  let picAdmissions = 0;
  
  for (let i = 0; i < scenario.duree_jours; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Calculer le facteur d'intensité progressif (monte puis descend)
    const progressionFactor = calculateProgressionFactor(i, scenario.duree_jours, scenario.type);
    
    // Calculer les admissions simulées
    const facteurIntensiteTotal = 1 + (scenario.intensite * (facteurs.admissions - 1) * progressionFactor);
    const admissionsBase = avgAdmissions;
    const admissionsSimulees = Math.round(admissionsBase * facteurIntensiteTotal);
    
    // Calculer les ressources nécessaires
    const litsRequis = Math.round(admissionsSimulees * facteurs.duree_moyenne);
    const personnelRequis = Math.round(litsRequis * PERSONNEL_PAR_LIT);
    const coutEstime = admissionsSimulees * COUT_MOYEN_ADMISSION;
    
    // Calculer la capacité totale disponible
    const capaciteTotale = scenario.services_affectes.reduce(
      (sum, service) => sum + CAPACITE_LITS[service],
      0
    );
    
    const alerteSaturation = litsRequis > capaciteTotale * 0.9;
    
    // Mettre à jour les totaux
    totalAdmissions += admissionsSimulees;
    totalCout += coutEstime;
    if (alerteSaturation) joursSaturation++;
    if (admissionsSimulees > picAdmissions) picAdmissions = admissionsSimulees;
    
    // Personnel supplémentaire nécessaire
    const personnelDisponible = scenario.services_affectes.reduce(
      (sum, service) => sum + PERSONNEL_BASE[service],
      0
    );
    const personnelSupp = Math.max(0, personnelRequis - personnelDisponible);
    totalPersonnelSupp += personnelSupp;
    
    projections.push({
      date: date.toISOString().split('T')[0],
      admissions_base: Math.round(admissionsBase),
      admissions_simulees: admissionsSimulees,
      lits_requis: litsRequis,
      personnel_requis: personnelRequis,
      cout_estime: coutEstime,
      alerte_saturation: alerteSaturation,
    });
  }
  
  // Générer les recommandations
  const recommandations = generateRecommandations(scenario, {
    pic_admissions: picAdmissions,
    total_admissions: totalAdmissions,
    personnel_supplementaire: Math.round(totalPersonnelSupp / scenario.duree_jours),
    cout_total: totalCout,
    jours_saturation: joursSaturation,
  });
  
  return {
    scenario,
    projections,
    resume: {
      pic_admissions: picAdmissions,
      total_admissions: totalAdmissions,
      personnel_supplementaire: Math.round(totalPersonnelSupp / scenario.duree_jours),
      cout_total: totalCout,
      jours_saturation: joursSaturation,
    },
    recommandations,
  };
}

function calculateProgressionFactor(
  jour: number,
  dureeTotale: number,
  type: string
): number {
  // Pour une épidémie ou canicule: monte puis descend
  if (type === 'epidemie' || type === 'canicule' || type === 'pic_saisonnier') {
    const midpoint = dureeTotale / 2;
    if (jour < midpoint) {
      return jour / midpoint;
    } else {
      return 1 - ((jour - midpoint) / midpoint);
    }
  }
  
  // Pour un afflux massif: pic au début puis décroissance
  if (type === 'afflux_massif') {
    return Math.exp(-jour / 3);
  }
  
  // Pour une grève: constant
  return 1;
}

function generateRecommandations(
  scenario: ScenarioParams,
  resume: SimulationResult['resume']
): Recommandation[] {
  const recommandations: Recommandation[] = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Recommandations RH
  if (resume.personnel_supplementaire > 10) {
    recommandations.push({
      type: 'rh',
      priorite: resume.personnel_supplementaire > 30 ? 'critique' : 'haute',
      message: `Mobiliser ${resume.personnel_supplementaire} agents supplémentaires pour la période de crise`,
      date_effet: today,
    });
  }
  
  if (scenario.type === 'greve') {
    recommandations.push({
      type: 'rh',
      priorite: 'critique',
      message: 'Activer le protocole de service minimum et contacter les intérimaires',
      date_effet: today,
    });
  }
  
  // Recommandations logistiques
  if (scenario.type === 'epidemie') {
    recommandations.push({
      type: 'logistique',
      priorite: 'haute',
      message: 'Commander des stocks supplémentaires de matériel de protection et médicaments antiviraux',
      date_effet: today,
    });
  }
  
  if (resume.jours_saturation > 3) {
    recommandations.push({
      type: 'logistique',
      priorite: 'critique',
      message: `Prévoir ${Math.ceil(resume.pic_admissions * 0.3)} lits supplémentaires (lits de campagne, transferts)`,
      date_effet: today,
    });
  }
  
  // Recommandations opérationnelles
  if (resume.jours_saturation > 0) {
    recommandations.push({
      type: 'operationnel',
      priorite: 'critique',
      message: 'Activer le plan blanc pour gérer l\'afflux de patients',
      date_effet: today,
    });
    
    recommandations.push({
      type: 'operationnel',
      priorite: 'haute',
      message: 'Reporter les interventions chirurgicales non urgentes de 30%',
      date_effet: today,
    });
  }
  
  if (scenario.type === 'canicule') {
    recommandations.push({
      type: 'operationnel',
      priorite: 'haute',
      message: 'Activer le plan canicule: renforcer la climatisation et l\'hydratation des patients',
      date_effet: today,
    });
  }
  
  if (scenario.type === 'afflux_massif') {
    recommandations.push({
      type: 'operationnel',
      priorite: 'critique',
      message: 'Déclencher le plan ORSEC et coordonner avec le SAMU',
      date_effet: today,
    });
  }
  
  // Trier par priorité
  const prioriteOrdre = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
  recommandations.sort((a, b) => prioriteOrdre[a.priorite] - prioriteOrdre[b.priorite]);
  
  return recommandations;
}

// Générer des recommandations automatiques basées sur les prédictions
export function generatePredictionRecommandations(
  predictions: { date: string; predicted_admissions: number }[],
  avgAdmissions: number
): Recommandation[] {
  const recommandations: Recommandation[] = [];
  
  predictions.forEach(pred => {
    const variation = ((pred.predicted_admissions - avgAdmissions) / avgAdmissions) * 100;
    
    if (variation > 30) {
      recommandations.push({
        type: 'rh',
        priorite: 'haute',
        message: `Augmenter le personnel de ${Math.round(variation / 3)}% pour le ${pred.date}`,
        date_effet: pred.date,
      });
    } else if (variation > 15) {
      recommandations.push({
        type: 'operationnel',
        priorite: 'moyenne',
        message: `Prévoir une charge accrue (+${Math.round(variation)}%) le ${pred.date}`,
        date_effet: pred.date,
      });
    }
  });
  
  return recommandations;
}
