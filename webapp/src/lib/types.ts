// Types pour les données hospitalières

export interface Admission {
  id_patient: string;
  date_admission: string;
  date_sortie: string;
  age: number;
  sexe: 'M' | 'F';
  service: ServiceType;
  gravite: GraviteType;
  duree_sejour: number;
  motif_admission: string;
  type_admission: TypeAdmission;
  personnel_requis: number;
  cout_sejour: number;
}

export type ServiceType = 
  | 'Urgences' 
  | 'Cardiologie' 
  | 'Neurologie' 
  | 'Maladies Infectieuses' 
  | 'Pédiatrie' 
  | 'Réanimation';

export type GraviteType = 'Légère' | 'Modérée' | 'Grave' | 'Critique';

export type TypeAdmission = 'Urgence' | 'Programmée' | 'Transfert';

export interface DailyStats {
  date: string;
  admissions: number;
  duree_moyenne: number;
  cout_total: number;
  cout_moyen: number;
  personnel_total: number;
  age_moyen: number;
  jour_semaine: number;
  mois: number;
  annee: number;
  semaine: number;
  jour_nom: string;
}

export interface ServiceDailyStats {
  date: string;
  service: ServiceType;
  admissions: number;
  duree_moyenne: number;
  cout_total: number;
  cas_graves: number;
}

export interface ResourceStats {
  date: string;
  service: ServiceType;
  lits_total: number;
  lits_occupes: number;
  lits_disponibles: number;
  taux_occupation: number;
  personnel_total: number;
  personnel_disponible: number;
  personnel_occupe: number;
}

export interface Prediction {
  date: string;
  predicted_admissions: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
}

export interface PredictionResponse {
  model: string;
  generated_at: string;
  metrics: {
    mae: number;
    rmse: number;
    mape: number;
    r2: number;
  };
  predictions: Prediction[];
}

export interface EnsemblePrediction {
  date: string;
  arima_prediction: number;
  rf_prediction: number;
  ensemble_prediction: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
}

export interface EnsemblePredictionResponse {
  models: string[];
  weights: {
    arima: number;
    random_forest: number;
  };
  generated_at: string;
  metrics: {
    arima: {
      mae: number;
      rmse: number;
      mape: number;
      r2: number;
    };
    random_forest: {
      mae: number;
      rmse: number;
      mape: number;
      r2: number;
    };
  };
  predictions: EnsemblePrediction[];
}

export interface SeasonalityAnalysis {
  monthly_factors: Record<string, number>;
  weekly_factors: Record<string, number>;
}

// Types pour les simulations
export type ScenarioType = 
  | 'epidemie' 
  | 'greve' 
  | 'afflux_massif' 
  | 'pic_saisonnier' 
  | 'canicule';

export interface ScenarioParams {
  type: ScenarioType;
  duree_jours: number;
  intensite: number; // Facteur multiplicateur
  services_affectes: ServiceType[];
  params_specifiques?: Record<string, number | string>;
}

export interface SimulationResult {
  scenario: ScenarioParams;
  projections: {
    date: string;
    admissions_base: number;
    admissions_simulees: number;
    lits_requis: number;
    personnel_requis: number;
    cout_estime: number;
    alerte_saturation: boolean;
  }[];
  resume: {
    pic_admissions: number;
    total_admissions: number;
    personnel_supplementaire: number;
    cout_total: number;
    jours_saturation: number;
  };
  recommandations: Recommandation[];
}

export interface Recommandation {
  type: 'rh' | 'logistique' | 'operationnel';
  priorite: 'critique' | 'haute' | 'moyenne' | 'basse';
  message: string;
  date_effet?: string;
}

// Types pour les KPIs
export interface DashboardKPIs {
  admissions_aujourdhui: number;
  admissions_semaine: number;
  taux_occupation_moyen: number;
  personnel_disponible: number;
  alertes: Alert[];
  tendance: 'hausse' | 'stable' | 'baisse';
  variation_pourcentage: number;
}

export interface Alert {
  id: string;
  type: 'saturation' | 'personnel' | 'stock' | 'epidemie';
  service?: ServiceType;
  message: string;
  niveau: 'info' | 'warning' | 'critical';
  date: string;
}

// Types pour les filtres
export interface DashboardFilters {
  dateDebut?: string;
  dateFin?: string;
  service?: ServiceType;
  typePatient?: 'pediatrique' | 'adulte' | 'geriatrique';
  typeAdmission?: TypeAdmission;
}
