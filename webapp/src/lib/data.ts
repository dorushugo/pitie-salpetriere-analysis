import { promises as fs } from 'fs';
import path from 'path';
import type {
  DailyStats,
  ServiceDailyStats,
  ResourceStats,
  PredictionResponse,
  EnsemblePredictionResponse,
  SeasonalityAnalysis,
  DashboardKPIs,
  Alert,
  ServiceType,
} from './types';

const DATA_DIR = path.join(process.cwd(), '..', 'data');

// Utilitaire pour parser CSV
function parseCSV<T>(content: string): T[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  // Colonnes qui doivent rester en string (ne pas convertir en nombre)
  const stringColumns = ['date', 'service', 'id_patient', 'sexe', 'gravite', 'motif_admission', 'type_admission', 'jour_nom'];
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: Record<string, string | number> = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      
      // Garder certaines colonnes en string
      if (stringColumns.includes(header)) {
        obj[header] = value;
      } else {
        // Essayer de convertir en nombre
        const numValue = parseFloat(value);
        obj[header] = isNaN(numValue) ? value : numValue;
      }
    });
    
    return obj as T;
  });
}

// Charger les statistiques journalières
export async function getDailyStats(): Promise<DailyStats[]> {
  const filePath = path.join(DATA_DIR, 'daily_stats.csv');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseCSV<DailyStats>(content);
}

// Charger les statistiques par service
export async function getServiceStats(): Promise<ServiceDailyStats[]> {
  const filePath = path.join(DATA_DIR, 'service_daily_stats.csv');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseCSV<ServiceDailyStats>(content);
}

// Charger les données de ressources
export async function getResourceStats(): Promise<ResourceStats[]> {
  const filePath = path.join(DATA_DIR, 'resources.csv');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseCSV<ResourceStats>(content);
}

// Charger les prédictions ARIMA
export async function getARIMAPredictions(): Promise<PredictionResponse> {
  const filePath = path.join(DATA_DIR, 'predictions_arima.json');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

// Charger les prédictions Random Forest
export async function getRFPredictions(): Promise<PredictionResponse> {
  const filePath = path.join(DATA_DIR, 'predictions_rf.json');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

// Charger les prédictions ensemble
export async function getEnsemblePredictions(): Promise<EnsemblePredictionResponse> {
  const filePath = path.join(DATA_DIR, 'predictions_ensemble.json');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

// Charger l'analyse de saisonnalité
export async function getSeasonalityAnalysis(): Promise<SeasonalityAnalysis> {
  const filePath = path.join(DATA_DIR, 'seasonality_analysis.json');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

// Calculer les KPIs pour le dashboard
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const dailyStats = await getDailyStats();
  const resourceStats = await getResourceStats();
  
  // Trier par date décroissante
  dailyStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const today = dailyStats[0];
  const lastWeek = dailyStats.slice(0, 7);
  const previousWeek = dailyStats.slice(7, 14);
  
  // Admissions de la semaine
  const admissionsSemaine = lastWeek.reduce((sum, d) => sum + d.admissions, 0);
  const admissionsSemainePrecedente = previousWeek.reduce((sum, d) => sum + d.admissions, 0);
  
  // Variation
  const variation = ((admissionsSemaine - admissionsSemainePrecedente) / admissionsSemainePrecedente) * 100;
  
  // Convertir la date en string pour comparaison (format YYYY-MM-DD)
  const todayDateStr = String(today.date).split('T')[0];
  
  // Filtrer les ressources pour aujourd'hui
  const todayResources = resourceStats.filter(r => {
    const resourceDateStr = String(r.date).split('T')[0];
    return resourceDateStr === todayDateStr;
  });
  
  // Taux d'occupation moyen
  const tauxOccupationMoyen = todayResources.length > 0
    ? todayResources.reduce((sum, r) => sum + r.taux_occupation, 0) / todayResources.length
    : 0;
  
  // Personnel disponible
  const personnelDispo = todayResources.reduce((sum, r) => sum + r.personnel_disponible, 0);
  
  // Générer des alertes
  const alertes: Alert[] = [];
  
  todayResources.forEach(r => {
    if (r.taux_occupation > 85) {
      alertes.push({
        id: `sat-${r.service}`,
        type: 'saturation',
        service: r.service as ServiceType,
        message: `Taux d'occupation de ${r.taux_occupation}% en ${r.service}`,
        niveau: r.taux_occupation > 90 ? 'critical' : 'warning',
        date: todayDateStr,
      });
    }
  });
  
  // Tendance
  let tendance: 'hausse' | 'stable' | 'baisse' = 'stable';
  if (variation > 5) tendance = 'hausse';
  else if (variation < -5) tendance = 'baisse';
  
  return {
    admissions_aujourdhui: today.admissions,
    admissions_semaine: admissionsSemaine,
    taux_occupation_moyen: Math.round(tauxOccupationMoyen * 10) / 10,
    personnel_disponible: personnelDispo,
    alertes,
    tendance,
    variation_pourcentage: Math.round(variation * 10) / 10,
  };
}

// Obtenir les données filtrées par période
export async function getFilteredStats(
  dateDebut?: string,
  dateFin?: string,
  service?: ServiceType
): Promise<{
  daily: DailyStats[];
  services: ServiceDailyStats[];
  resources: ResourceStats[];
}> {
  let dailyStats = await getDailyStats();
  let serviceStats = await getServiceStats();
  let resourceStats = await getResourceStats();
  
  // Filtrer par date
  if (dateDebut) {
    const startDate = new Date(dateDebut);
    dailyStats = dailyStats.filter(d => new Date(d.date) >= startDate);
    serviceStats = serviceStats.filter(d => new Date(d.date) >= startDate);
    resourceStats = resourceStats.filter(d => new Date(d.date) >= startDate);
  }
  
  if (dateFin) {
    const endDate = new Date(dateFin);
    dailyStats = dailyStats.filter(d => new Date(d.date) <= endDate);
    serviceStats = serviceStats.filter(d => new Date(d.date) <= endDate);
    resourceStats = resourceStats.filter(d => new Date(d.date) <= endDate);
  }
  
  // Filtrer par service
  if (service) {
    serviceStats = serviceStats.filter(d => d.service === service);
    resourceStats = resourceStats.filter(d => d.service === service);
  }
  
  return {
    daily: dailyStats,
    services: serviceStats,
    resources: resourceStats,
  };
}

// Obtenir les données agrégées par mois
export async function getMonthlyAggregates(): Promise<{
  mois: string;
  admissions: number;
  cout_total: number;
}[]> {
  const filePath = path.join(DATA_DIR, 'monthly_stats.csv');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseCSV(content);
}
