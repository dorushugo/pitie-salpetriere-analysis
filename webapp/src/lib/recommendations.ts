/**
 * Module de Recommandations Intelligentes
 * ========================================
 * 
 * Ce module analyse l'état actuel de l'hôpital et génère des recommandations
 * actionnables, quantifiées et priorisées pour les décideurs.
 * 
 * Catégories de recommandations:
 * - RH: Recrutement, planning, rappels
 * - Capacité: Lits, transferts, zones de débordement
 * - Logistique: Stocks, matériel, approvisionnement
 * - Organisation: Protocoles, coordination, communication
 */

import type { ServiceType } from './types';

// Types pour le module de recommandation
export type RecommandationCategory = 'rh' | 'capacite' | 'logistique' | 'organisation';
export type RecommandationPriority = 'critique' | 'haute' | 'moyenne' | 'basse';
export type RecommandationStatus = 'nouvelle' | 'en_cours' | 'completee' | 'ignoree';

export type SmartRecommandation = {
  id: string;
  categorie: RecommandationCategory;
  priorite: RecommandationPriority;
  titre: string;
  description: string;
  action_concrete: string;
  impact_estime: string;
  quantification: {
    nombre?: number;
    unite?: string;
    cout_estime?: number;
    economie_potentielle?: number;
  };
  echeance: 'immediat' | 'aujourd_hui' | 'cette_semaine' | 'ce_mois';
  services_concernes: ServiceType[];
  declencheur: string;
  status: RecommandationStatus;
  date_creation: string;
};

export type HospitalState = {
  // État actuel
  tauxOccupationGlobal: number;
  tauxOccupationParService: Record<ServiceType, number>;
  personnelDisponible: number;
  personnelRequis: number;
  admissionsAujourdhui: number;
  admissionsMoyenne: number;
  
  // Prédictions
  variationPrevue7j: number;
  picPrevu: { date: string; variation: number } | null;
  
  // Contexte
  saison: 'hiver' | 'printemps' | 'ete' | 'automne';
  jourSemaine: number;
  evenementEnCours: string | null;
  
  // Ressources
  litsDisponibles: number;
  litsTotal: number;
  stocksCritiques: boolean;
  tauxInterim: number;
  tauxHeuresSupp: number;
};

// Seuils de déclenchement
const SEUILS = {
  occupation: {
    vigilance: 75,
    tension: 85,
    saturation: 95,
  },
  personnel: {
    deficit_leger: 0.9,
    deficit_modere: 0.8,
    deficit_critique: 0.7,
  },
  variation_admissions: {
    legere: 10,
    moderee: 20,
    forte: 30,
  },
  interim: {
    acceptable: 5,
    eleve: 10,
    critique: 15,
  },
};

// Coûts de référence
const COUTS = {
  interim_jour: 350,
  heure_supp: 45,
  lit_supplementaire: 500,
  rappel_personnel: 200,
  recrutement_ide: 3000,
};

/**
 * Génère les recommandations basées sur l'état actuel de l'hôpital
 */
export function generateSmartRecommendations(state: HospitalState): SmartRecommandation[] {
  const recommendations: SmartRecommandation[] = [];
  const now = new Date().toISOString();

  // 1. Analyse de l'occupation
  recommendations.push(...analyzeOccupation(state, now));
  
  // 2. Analyse du personnel
  recommendations.push(...analyzePersonnel(state, now));
  
  // 3. Analyse des prédictions
  recommendations.push(...analyzePredictions(state, now));
  
  // 4. Analyse saisonnière
  recommendations.push(...analyzeSeasonality(state, now));
  
  // 5. Analyse financière
  recommendations.push(...analyzeFinancial(state, now));
  
  // 6. Recommandations proactives (toujours utiles)
  recommendations.push(...generateProactiveRecommendations(state, now));
  
  // Trier par priorité
  const priorityOrder: Record<RecommandationPriority, number> = {
    critique: 0,
    haute: 1,
    moyenne: 2,
    basse: 3,
  };
  
  recommendations.sort((a, b) => priorityOrder[a.priorite] - priorityOrder[b.priorite]);
  
  return recommendations;
}

function analyzeOccupation(state: HospitalState, now: string): SmartRecommandation[] {
  const recs: SmartRecommandation[] = [];
  
  // Saturation globale
  if (state.tauxOccupationGlobal >= SEUILS.occupation.saturation) {
    recs.push({
      id: `occ-sat-${Date.now()}`,
      categorie: 'capacite',
      priorite: 'critique',
      titre: 'Saturation imminente - Activation capacités de réserve',
      description: `Taux d'occupation à ${state.tauxOccupationGlobal}%. Risque de blocage des admissions.`,
      action_concrete: 'Ouvrir les lits de débordement et activer le protocole de délestage',
      impact_estime: 'Éviter le blocage des urgences et les transferts forcés',
      quantification: {
        nombre: Math.ceil((state.tauxOccupationGlobal - 85) * state.litsTotal / 100),
        unite: 'lits à libérer',
        cout_estime: Math.ceil((state.tauxOccupationGlobal - 85) * state.litsTotal / 100) * COUTS.lit_supplementaire,
      },
      echeance: 'immediat',
      services_concernes: ['Urgences', 'Réanimation'],
      declencheur: `Taux occupation ${state.tauxOccupationGlobal}% > seuil ${SEUILS.occupation.saturation}%`,
      status: 'nouvelle',
      date_creation: now,
    });
  } else if (state.tauxOccupationGlobal >= SEUILS.occupation.tension) {
    recs.push({
      id: `occ-tens-${Date.now()}`,
      categorie: 'capacite',
      priorite: 'haute',
      titre: 'Tension capacitaire - Préparer les réserves',
      description: `Taux d'occupation à ${state.tauxOccupationGlobal}%. Anticipez l'ouverture de capacités.`,
      action_concrete: 'Vérifier la disponibilité des lits de SSR convertibles et préparer le matériel',
      impact_estime: 'Réduction du temps de réponse en cas de saturation',
      quantification: {
        nombre: Math.ceil((95 - state.tauxOccupationGlobal) * state.litsTotal / 100),
        unite: 'lits de marge avant saturation',
      },
      echeance: 'aujourd_hui',
      services_concernes: ['Urgences'],
      declencheur: `Taux occupation ${state.tauxOccupationGlobal}% > seuil ${SEUILS.occupation.tension}%`,
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  // Services en difficulté
  Object.entries(state.tauxOccupationParService).forEach(([service, taux]) => {
    if (taux >= 90) {
      recs.push({
        id: `occ-srv-${service}-${Date.now()}`,
        categorie: 'capacite',
        priorite: taux >= 95 ? 'critique' : 'haute',
        titre: `${service} en saturation (${taux}%)`,
        description: `Le service ${service} atteint sa capacité maximale.`,
        action_concrete: `Transférer les patients stables vers d'autres services ou établissements partenaires`,
        impact_estime: `Libérer 5-10 lits en ${service}`,
        quantification: {
          nombre: Math.ceil((taux - 80) * 10 / 100),
          unite: 'transferts recommandés',
        },
        echeance: 'immediat',
        services_concernes: [service as ServiceType],
        declencheur: `Occupation ${service} à ${taux}%`,
        status: 'nouvelle',
        date_creation: now,
      });
    }
  });
  
  return recs;
}

function analyzePersonnel(state: HospitalState, now: string): SmartRecommandation[] {
  const recs: SmartRecommandation[] = [];
  const ratio = state.personnelDisponible / state.personnelRequis;
  const deficit = state.personnelRequis - state.personnelDisponible;
  
  if (ratio < SEUILS.personnel.deficit_critique) {
    recs.push({
      id: `pers-crit-${Date.now()}`,
      categorie: 'rh',
      priorite: 'critique',
      titre: 'Déficit personnel critique - Rappels immédiats',
      description: `Seulement ${Math.round(ratio * 100)}% du personnel requis disponible.`,
      action_concrete: 'Activer les rappels d\'astreinte et contacter le pool de remplacement',
      impact_estime: 'Maintenir la qualité des soins et éviter la fermeture de lits',
      quantification: {
        nombre: deficit,
        unite: 'soignants manquants',
        cout_estime: deficit * COUTS.rappel_personnel,
      },
      echeance: 'immediat',
      services_concernes: ['Urgences', 'Réanimation'],
      declencheur: `Ratio personnel ${Math.round(ratio * 100)}% < seuil ${SEUILS.personnel.deficit_critique * 100}%`,
      status: 'nouvelle',
      date_creation: now,
    });
  } else if (ratio < SEUILS.personnel.deficit_modere) {
    recs.push({
      id: `pers-mod-${Date.now()}`,
      categorie: 'rh',
      priorite: 'haute',
      titre: 'Déficit personnel modéré - Renfort nécessaire',
      description: `${deficit} soignants manquants par rapport aux besoins.`,
      action_concrete: 'Proposer des heures supplémentaires aux équipes disponibles',
      impact_estime: 'Combler le déficit sans recours à l\'intérim',
      quantification: {
        nombre: deficit,
        unite: 'postes à couvrir',
        cout_estime: deficit * 8 * COUTS.heure_supp, // 8h de travail
        economie_potentielle: deficit * COUTS.interim_jour - deficit * 8 * COUTS.heure_supp,
      },
      echeance: 'aujourd_hui',
      services_concernes: ['Urgences', 'Cardiologie', 'Neurologie', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation'],
      declencheur: `Déficit de ${deficit} soignants`,
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  // Taux d'intérim élevé
  if (state.tauxInterim > SEUILS.interim.eleve) {
    const economie = Math.round(state.personnelDisponible * (state.tauxInterim / 100) * COUTS.interim_jour * 30 * 0.3);
    recs.push({
      id: `pers-int-${Date.now()}`,
      categorie: 'rh',
      priorite: state.tauxInterim > SEUILS.interim.critique ? 'haute' : 'moyenne',
      titre: 'Taux d\'intérim élevé - Lancer recrutement',
      description: `${state.tauxInterim}% du personnel est intérimaire, coûtant ${state.tauxInterim * COUTS.interim_jour * 30}€/mois en plus.`,
      action_concrete: 'Lancer une campagne de recrutement IDE sur les plateformes spécialisées (Hublo, FHF)',
      impact_estime: `Économie potentielle de ${economie.toLocaleString()}€/mois en réduisant l'intérim de 30%`,
      quantification: {
        nombre: Math.ceil(state.personnelDisponible * state.tauxInterim / 100),
        unite: 'postes intérim à convertir',
        economie_potentielle: economie,
      },
      echeance: 'ce_mois',
      services_concernes: ['Urgences', 'Cardiologie', 'Neurologie', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation'],
      declencheur: `Taux intérim ${state.tauxInterim}% > seuil ${SEUILS.interim.eleve}%`,
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  return recs;
}

function analyzePredictions(state: HospitalState, now: string): SmartRecommandation[] {
  const recs: SmartRecommandation[] = [];
  
  if (state.variationPrevue7j > SEUILS.variation_admissions.forte) {
    recs.push({
      id: `pred-forte-${Date.now()}`,
      categorie: 'organisation',
      priorite: 'haute',
      titre: `Pic d'activité prévu (+${state.variationPrevue7j}%)`,
      description: `Les prédictions indiquent une hausse significative des admissions dans les 7 prochains jours.`,
      action_concrete: 'Planifier le rappel de personnel et préparer les capacités de réserve dès maintenant',
      impact_estime: 'Éviter la saturation et maintenir les délais de prise en charge',
      quantification: {
        nombre: Math.ceil(state.admissionsMoyenne * state.variationPrevue7j / 100),
        unite: 'admissions supplémentaires/jour attendues',
      },
      echeance: 'cette_semaine',
      services_concernes: ['Urgences', 'Maladies Infectieuses', 'Pédiatrie'],
      declencheur: `Variation prévue +${state.variationPrevue7j}% > seuil ${SEUILS.variation_admissions.forte}%`,
      status: 'nouvelle',
      date_creation: now,
    });
  } else if (state.variationPrevue7j > SEUILS.variation_admissions.moderee) {
    recs.push({
      id: `pred-mod-${Date.now()}`,
      categorie: 'organisation',
      priorite: 'moyenne',
      titre: `Hausse d'activité anticipée (+${state.variationPrevue7j}%)`,
      description: `Une augmentation modérée des admissions est prévue.`,
      action_concrete: 'Vérifier les plannings et identifier les créneaux de renfort possibles',
      impact_estime: 'Anticiper les besoins avant tension',
      quantification: {
        nombre: Math.ceil(state.admissionsMoyenne * state.variationPrevue7j / 100),
        unite: 'admissions supplémentaires/jour',
      },
      echeance: 'cette_semaine',
      services_concernes: ['Urgences'],
      declencheur: `Variation prévue +${state.variationPrevue7j}%`,
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  // Pic spécifique prévu
  if (state.picPrevu && state.picPrevu.variation > 20) {
    const dateObj = new Date(state.picPrevu.date);
    const joursRestants = Math.ceil((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    recs.push({
      id: `pred-pic-${Date.now()}`,
      categorie: 'rh',
      priorite: joursRestants <= 3 ? 'critique' : 'haute',
      titre: `Pic prévu le ${dateObj.toLocaleDateString('fr-FR')} (+${state.picPrevu.variation}%)`,
      description: `Un pic significatif est prévu dans ${joursRestants} jours.`,
      action_concrete: joursRestants <= 3 
        ? 'Activer immédiatement les rappels et confirmer les disponibilités'
        : 'Planifier les renforts et vérifier les stocks',
      impact_estime: 'Capacité suffisante pour absorber le pic',
      quantification: {
        nombre: Math.ceil(state.picPrevu.variation / 10),
        unite: 'soignants supplémentaires nécessaires',
      },
      echeance: joursRestants <= 3 ? 'immediat' : 'cette_semaine',
      services_concernes: ['Urgences', 'Maladies Infectieuses'],
      declencheur: `Pic +${state.picPrevu.variation}% prévu dans ${joursRestants} jours`,
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  return recs;
}

function analyzeSeasonality(state: HospitalState, now: string): SmartRecommandation[] {
  const recs: SmartRecommandation[] = [];
  
  // Recommandations saisonnières
  if (state.saison === 'hiver') {
    recs.push({
      id: `sais-hiv-${Date.now()}`,
      categorie: 'logistique',
      priorite: 'moyenne',
      titre: 'Protocole hivernal - Vérification stocks',
      description: 'Période à risque épidémique (grippe, bronchiolite, COVID).',
      action_concrete: 'Vérifier les stocks de vaccins, antiviraux et matériel de protection',
      impact_estime: 'Réduction des ruptures de stock pendant les pics épidémiques',
      quantification: {},
      echeance: 'cette_semaine',
      services_concernes: ['Urgences', 'Maladies Infectieuses', 'Pédiatrie'],
      declencheur: 'Période hivernale',
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  if (state.saison === 'ete') {
    recs.push({
      id: `sais-ete-${Date.now()}`,
      categorie: 'organisation',
      priorite: 'moyenne',
      titre: 'Anticipation période estivale',
      description: 'Période de congés avec risque de sous-effectif et de canicule.',
      action_concrete: 'Planifier les congés pour garantir un effectif minimum et préparer le plan canicule',
      impact_estime: 'Maintien de la capacité opérationnelle pendant l\'été',
      quantification: {},
      echeance: 'ce_mois',
      services_concernes: ['Urgences', 'Cardiologie'],
      declencheur: 'Période estivale',
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  // Lundi = accumulation du weekend
  if (state.jourSemaine === 1) { // Lundi
    const surchargeAttendue = Math.round(state.admissionsMoyenne * 0.09); // +9% le lundi (données DREES)
    recs.push({
      id: `sais-lun-${Date.now()}`,
      categorie: 'organisation',
      priorite: 'basse',
      titre: 'Lundi - Surcharge attendue (+9%)',
      description: 'Accumulation des besoins du weekend. Données DREES: +9.3% d\'admissions le lundi.',
      action_concrete: 'Renforcer l\'équipe du matin et prioriser les sorties',
      impact_estime: 'Fluidification des admissions du lundi',
      quantification: {
        nombre: surchargeAttendue,
        unite: 'admissions supplémentaires attendues',
      },
      echeance: 'aujourd_hui',
      services_concernes: ['Urgences'],
      declencheur: 'Jour = Lundi',
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  return recs;
}

function analyzeFinancial(state: HospitalState, now: string): SmartRecommandation[] {
  const recs: SmartRecommandation[] = [];
  
  // Heures supplémentaires élevées
  if (state.tauxHeuresSupp > 15) {
    const coutHeureSuppMensuel = state.personnelDisponible * state.tauxHeuresSupp / 100 * 8 * COUTS.heure_supp * 20;
    recs.push({
      id: `fin-hs-${Date.now()}`,
      categorie: 'rh',
      priorite: 'moyenne',
      titre: 'Heures supplémentaires élevées',
      description: `${state.tauxHeuresSupp}% du temps de travail en heures supplémentaires.`,
      action_concrete: 'Recruter pour réduire la charge et le coût des heures supplémentaires',
      impact_estime: 'Réduction de la fatigue des équipes et des coûts',
      quantification: {
        cout_estime: coutHeureSuppMensuel,
        economie_potentielle: coutHeureSuppMensuel * 0.5,
        nombre: Math.ceil(state.personnelDisponible * state.tauxHeuresSupp / 100 / 8),
        unite: 'postes à créer pour absorber les HS',
      },
      echeance: 'ce_mois',
      services_concernes: ['Urgences', 'Cardiologie', 'Neurologie', 'Maladies Infectieuses', 'Pédiatrie', 'Réanimation'],
      declencheur: `Taux heures supp ${state.tauxHeuresSupp}% > 15%`,
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  return recs;
}

function generateProactiveRecommendations(state: HospitalState, now: string): SmartRecommandation[] {
  const recs: SmartRecommandation[] = [];
  
  // Optimisation du taux de rotation des lits
  if (state.tauxOccupationGlobal > 65 && state.tauxOccupationGlobal < 85) {
    recs.push({
      id: `proact-rotation-${Date.now()}`,
      categorie: 'organisation',
      priorite: 'moyenne',
      titre: 'Optimiser les sorties du matin',
      description: `Occupation à ${state.tauxOccupationGlobal}%. Marge d'optimisation possible.`,
      action_concrete: 'Anticiper les sorties avant 11h pour libérer les lits avant l\'afflux de l\'après-midi',
      impact_estime: 'Réduction du temps d\'attente aux urgences de 15-20%',
      quantification: {
        nombre: Math.round(state.litsTotal * 0.05),
        unite: 'lits libérables plus tôt',
        economie_potentielle: 2500, // Réduction coûts attente urgences
      },
      echeance: 'cette_semaine',
      services_concernes: ['Urgences'],
      declencheur: 'Optimisation proactive des flux',
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  // Analyse prédictive - préparer la semaine
  const jourActuel = new Date().getDay();
  if (jourActuel >= 1 && jourActuel <= 3) { // Lundi à mercredi
    recs.push({
      id: `proact-weekend-${Date.now()}`,
      categorie: 'rh',
      priorite: 'basse',
      titre: 'Anticiper le planning weekend',
      description: 'Les weekends génèrent +15% de passages aux urgences.',
      action_concrete: 'Confirmer les disponibilités du pool pour samedi/dimanche',
      impact_estime: 'Éviter les rappels de dernière minute',
      quantification: {
        nombre: 8,
        unite: 'soignants à confirmer',
      },
      echeance: 'cette_semaine',
      services_concernes: ['Urgences'],
      declencheur: 'Planification hebdomadaire',
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  // Recommandation de formation continue
  if (state.tauxOccupationGlobal < 75) {
    recs.push({
      id: `proact-formation-${Date.now()}`,
      categorie: 'rh',
      priorite: 'basse',
      titre: 'Période propice aux formations',
      description: `Occupation modérée (${state.tauxOccupationGlobal}%). Profiter pour former les équipes.`,
      action_concrete: 'Planifier des sessions de formation (gestes d\'urgence, nouveaux protocoles)',
      impact_estime: 'Amélioration des compétences sans impact sur l\'activité',
      quantification: {
        nombre: 4,
        unite: 'sessions possibles cette semaine',
      },
      echeance: 'cette_semaine',
      services_concernes: ['Urgences', 'Réanimation'],
      declencheur: 'Charge modérée',
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  // Vérification maintenance équipements
  recs.push({
    id: `proact-maint-${Date.now()}`,
    categorie: 'logistique',
    priorite: 'basse',
    titre: 'Contrôle maintenance équipements',
    description: 'Vérification préventive des équipements critiques.',
    action_concrete: 'Vérifier l\'état des respirateurs, moniteurs et défibrillateurs',
    impact_estime: 'Prévention des pannes en période critique',
    quantification: {
      nombre: 15,
      unite: 'équipements à contrôler',
    },
    echeance: 'cette_semaine',
    services_concernes: ['Réanimation', 'Urgences'],
    declencheur: 'Maintenance préventive',
    status: 'nouvelle',
    date_creation: now,
  });
  
  // Coordination avec partenaires
  if (state.tauxOccupationGlobal > 70) {
    recs.push({
      id: `proact-coord-${Date.now()}`,
      categorie: 'organisation',
      priorite: 'basse',
      titre: 'Maintenir le contact avec établissements partenaires',
      description: 'En cas de tension, les transferts doivent être rapides.',
      action_concrete: 'Vérifier les capacités disponibles auprès des cliniques et hôpitaux partenaires',
      impact_estime: 'Réduction du délai de transfert de 2h en cas de besoin',
      quantification: {
        nombre: 5,
        unite: 'établissements à contacter',
      },
      echeance: 'cette_semaine',
      services_concernes: ['Urgences'],
      declencheur: 'Coordination préventive',
      status: 'nouvelle',
      date_creation: now,
    });
  }
  
  return recs;
}

/**
 * Génère des recommandations pour un scénario de simulation
 */
export function generateScenarioRecommendations(
  scenarioType: string,
  intensite: number,
  dureeJours: number,
  impactAdmissions: number
): SmartRecommandation[] {
  const recs: SmartRecommandation[] = [];
  const now = new Date().toISOString();
  
  const scenarioConfig: Record<string, {
    titre: string;
    risques: string[];
    actions: { categorie: RecommandationCategory; action: string; priorite: RecommandationPriority }[];
  }> = {
    epidemie: {
      titre: 'Épidémie',
      risques: ['Saturation des urgences', 'Contamination du personnel', 'Rupture de stocks'],
      actions: [
        { categorie: 'logistique', action: 'Commander stocks antiviraux et équipements de protection', priorite: 'critique' },
        { categorie: 'rh', action: `Mobiliser ${Math.ceil(intensite * 20)} soignants supplémentaires`, priorite: 'critique' },
        { categorie: 'organisation', action: 'Activer les zones de cohorting dédiées', priorite: 'haute' },
        { categorie: 'capacite', action: `Prévoir ${Math.ceil(impactAdmissions * 0.3)} lits supplémentaires`, priorite: 'haute' },
      ],
    },
    greve: {
      titre: 'Grève du personnel',
      risques: ['Sous-effectif critique', 'Fermeture de lits', 'Report de soins'],
      actions: [
        { categorie: 'rh', action: 'Activer le protocole de service minimum', priorite: 'critique' },
        { categorie: 'rh', action: `Contacter ${Math.ceil(intensite * 30)} intérimaires d'urgence`, priorite: 'critique' },
        { categorie: 'organisation', action: 'Reporter les interventions programmées non urgentes', priorite: 'haute' },
        { categorie: 'organisation', action: 'Coordonner les transferts vers établissements partenaires', priorite: 'haute' },
      ],
    },
    afflux_massif: {
      titre: 'Afflux massif',
      risques: ['Saturation immédiate', 'Dépassement capacités', 'Tri des patients'],
      actions: [
        { categorie: 'organisation', action: 'Déclencher le plan blanc immédiatement', priorite: 'critique' },
        { categorie: 'organisation', action: 'Activer la cellule de crise et contacter l\'ARS', priorite: 'critique' },
        { categorie: 'capacite', action: `Libérer ${Math.ceil(impactAdmissions * 0.5)} lits en urgence`, priorite: 'critique' },
        { categorie: 'rh', action: 'Rappeler tout le personnel d\'astreinte', priorite: 'critique' },
      ],
    },
    canicule: {
      titre: 'Canicule',
      risques: ['Déshydratation', 'Coups de chaleur', 'Surcharge cardiologie'],
      actions: [
        { categorie: 'organisation', action: 'Activer le plan canicule niveau 3', priorite: 'haute' },
        { categorie: 'logistique', action: 'Vérifier climatisation et stocks de perfusions', priorite: 'haute' },
        { categorie: 'rh', action: `Renforcer cardiologie de ${Math.ceil(intensite * 10)} soignants`, priorite: 'haute' },
        { categorie: 'organisation', action: 'Coordonner avec les EHPAD pour les transferts', priorite: 'moyenne' },
      ],
    },
    pic_saisonnier: {
      titre: 'Pic saisonnier',
      risques: ['Saturation progressive', 'Épuisement des équipes', 'Allongement des délais'],
      actions: [
        { categorie: 'rh', action: `Planifier ${Math.ceil(intensite * 15)} rappels sur la période`, priorite: 'haute' },
        { categorie: 'capacite', action: 'Préparer l\'ouverture de lits de débordement', priorite: 'moyenne' },
        { categorie: 'organisation', action: 'Optimiser les sorties pour libérer des lits', priorite: 'moyenne' },
        { categorie: 'logistique', action: 'Constituer des stocks tampons', priorite: 'basse' },
      ],
    },
  };
  
  const config = scenarioConfig[scenarioType];
  if (!config) return recs;
  
  config.actions.forEach((action, index) => {
    recs.push({
      id: `scen-${scenarioType}-${index}-${Date.now()}`,
      categorie: action.categorie,
      priorite: action.priorite,
      titre: `${config.titre} - Action ${index + 1}`,
      description: `Risques: ${config.risques.join(', ')}`,
      action_concrete: action.action,
      impact_estime: 'Mitigation des risques du scénario',
      quantification: {
        nombre: dureeJours,
        unite: 'jours de crise',
      },
      echeance: action.priorite === 'critique' ? 'immediat' : 'aujourd_hui',
      services_concernes: ['Urgences', 'Réanimation'],
      declencheur: `Simulation scénario ${config.titre}`,
      status: 'nouvelle',
      date_creation: now,
    });
  });
  
  return recs;
}

/**
 * Formate une recommandation pour l'affichage
 */
export function formatRecommendationForDisplay(rec: SmartRecommandation) {
  const priorityLabels: Record<RecommandationPriority, string> = {
    critique: '🔴 Critique',
    haute: '🟠 Haute',
    moyenne: '🟡 Moyenne',
    basse: '🟢 Basse',
  };
  
  const categoryLabels: Record<RecommandationCategory, string> = {
    rh: '👥 Ressources Humaines',
    capacite: '🛏️ Capacité',
    logistique: '📦 Logistique',
    organisation: '📋 Organisation',
  };
  
  const echeanceLabels: Record<string, string> = {
    immediat: '⚡ Immédiat',
    aujourd_hui: '📅 Aujourd\'hui',
    cette_semaine: '📆 Cette semaine',
    ce_mois: '🗓️ Ce mois',
  };
  
  return {
    ...rec,
    prioriteLabel: priorityLabels[rec.priorite],
    categorieLabel: categoryLabels[rec.categorie],
    echeanceLabel: echeanceLabels[rec.echeance],
  };
}
