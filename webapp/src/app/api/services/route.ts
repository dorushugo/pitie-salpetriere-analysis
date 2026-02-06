import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), '..', 'data')
    
    // Charger les données par service
    let dashboardData = null
    let configServices = null
    let hospiDiag = null
    
    try {
      const dashboardPath = path.join(dataDir, 'dashboard_services.json')
      const content = await fs.readFile(dashboardPath, 'utf-8')
      dashboardData = JSON.parse(content)
    } catch {
      // Fichier pas encore généré
    }
    
    try {
      const configPath = path.join(dataDir, 'config_services.json')
      const content = await fs.readFile(configPath, 'utf-8')
      configServices = JSON.parse(content)
    } catch {
      // Fallback
    }
    
    try {
      const hospiPath = path.join(dataDir, 'hospidiag_pitie_2020_2023.json')
      const content = await fs.readFile(hospiPath, 'utf-8')
      hospiDiag = JSON.parse(content)
    } catch {
      // Pas de données Hospi-Diag
    }
    
    // Construire la réponse
    const services = [
      {
        id: 'medecine',
        nom: 'Médecine',
        lits: hospiDiag?.lits_places_sae?.lits_medecine?.[3] || 742,
        places_ambu: hospiDiag?.lits_places_sae?.places_medecine?.[3] || 231,
        taux_occupation: hospiDiag?.indicateurs_activite?.taux_occupation_medecine?.[3] || 67.0,
        evolution_lits: hospiDiag?.lits_places_sae?.lits_medecine || [1016, 895, 855, 742],
        admissions_2023: hospiDiag?.activite_globale_pmsi?.rsa_medecine_hc?.[3] || 36174,
        admissions_ambu_2023: hospiDiag?.activite_globale_pmsi?.rsa_medecine_ambulatoire?.[3] || 33976,
        couleur: '#3498db'
      },
      {
        id: 'chirurgie',
        nom: 'Chirurgie',
        lits: hospiDiag?.lits_places_sae?.lits_chirurgie?.[3] || 385,
        places_ambu: hospiDiag?.lits_places_sae?.places_chirurgie?.[3] || 54,
        taux_occupation: hospiDiag?.indicateurs_activite?.taux_occupation_chirurgie?.[3] || 109.1,
        evolution_lits: hospiDiag?.lits_places_sae?.lits_chirurgie || [386, 510, 503, 385],
        admissions_2023: hospiDiag?.activite_globale_pmsi?.rsa_chirurgie_hc?.[3] || 18625,
        admissions_ambu_2023: hospiDiag?.activite_globale_pmsi?.rsa_chirurgie_ambulatoire?.[3] || 8624,
        couleur: '#e74c3c'
      },
      {
        id: 'reanimation',
        nom: 'Réanimation',
        lits: hospiDiag?.lits_places_sae?.lits_reanimation?.[3] || 104,
        places_ambu: 0,
        taux_occupation: 85.0,
        evolution_lits: hospiDiag?.lits_places_sae?.lits_reanimation || [117, 110, 110, 104],
        admissions_2023: null,
        couleur: '#9b59b6'
      },
      {
        id: 'soins_intensifs',
        nom: 'Soins Intensifs',
        lits: hospiDiag?.lits_places_sae?.lits_soins_intensifs?.[3] || 70,
        places_ambu: 0,
        taux_occupation: 82.0,
        evolution_lits: hospiDiag?.lits_places_sae?.lits_soins_intensifs || [97, 97, 104, 70],
        admissions_2023: null,
        couleur: '#f39c12'
      },
      {
        id: 'usc',
        nom: 'USC',
        lits: hospiDiag?.lits_places_sae?.lits_surveillance_continue?.[3] || 49,
        places_ambu: 0,
        taux_occupation: 78.0,
        evolution_lits: hospiDiag?.lits_places_sae?.lits_surveillance_continue || [57, 51, 51, 49],
        admissions_2023: null,
        couleur: '#1abc9c'
      },
      {
        id: 'obstetrique',
        nom: 'Obstétrique',
        lits: hospiDiag?.lits_places_sae?.lits_obstetrique?.[3] || 48,
        places_ambu: hospiDiag?.lits_places_sae?.places_obstetrique?.[3] || 7,
        taux_occupation: hospiDiag?.indicateurs_activite?.taux_occupation_obstetrique?.[3] || 68.1,
        evolution_lits: hospiDiag?.lits_places_sae?.lits_obstetrique || [55, 46, 48, 48],
        admissions_2023: hospiDiag?.activite_globale_pmsi?.rsa_obstetrique_hc?.[3] || 2538,
        couleur: '#95a5a6'
      }
    ]
    
    // Totaux
    const total_lits = services.reduce((sum, s) => sum + s.lits, 0)
    const total_places = services.reduce((sum, s) => sum + s.places_ambu, 0)
    
    // Personnel - détail par catégorie
    const personnel = {
      etp_medicaux: hospiDiag?.personnel_etp?.etp_medicaux_total?.[3] || 958,
      etp_non_medicaux: hospiDiag?.personnel_etp?.etp_non_medicaux_total?.[3] || 7099,
      etp_soins: hospiDiag?.personnel_etp?.services_soins?.[3] || 4716,
      evolution: hospiDiag?.personnel_etp?.etp_non_medicaux_total || [7249, 7422, 7179, 7099],
      
      // Détail médicaux
      medecins: hospiDiag?.personnel_etp?.medecins_hors_anesthesistes?.[3] || 479,
      chirurgiens: hospiDiag?.personnel_etp?.chirurgiens_hors_gyneco?.[3] || 120,
      anesthesistes: hospiDiag?.personnel_etp?.anesthesistes?.[3] || 122,
      gyneco_obstetriciens: hospiDiag?.personnel_etp?.gynecologues_obstetriciens?.[3] || 13,
      
      // Détail non-médicaux
      administratifs: hospiDiag?.personnel_etp?.direction_administratifs?.[3] || 745,
      soins: hospiDiag?.personnel_etp?.services_soins?.[3] || 4716,
      medico_techniques: hospiDiag?.personnel_etp?.medico_techniques?.[3] || 598,
      educatifs_sociaux: hospiDiag?.personnel_etp?.educatifs_sociaux?.[3] || 87,
      techniques_ouvriers: hospiDiag?.personnel_etp?.techniques_ouvriers?.[3] || 953,
      
      // Évolution par catégorie
      evolution_medicaux: hospiDiag?.personnel_etp?.etp_medicaux_total || [914, 956, 949, 958],
      evolution_soins: hospiDiag?.personnel_etp?.services_soins || [4917, 4989, 4818, 4716],
    }
    
    // Équipements
    const equipements = {
      scanners: hospiDiag?.plateaux_techniques?.scanners?.[3] || 7,
      irm: hospiDiag?.plateaux_techniques?.irm?.[3] || 6,
      salles_bloc: hospiDiag?.plateaux_techniques?.salles_intervention_chirurgicale?.[3] || 53,
      tep_scan: hospiDiag?.plateaux_techniques?.tep_scan?.[3] || 3
    }
    
    return NextResponse.json({
      etablissement: 'Pitié-Salpêtrière',
      finess: '750100125',
      annees: [2020, 2021, 2022, 2023],
      derniere_maj: new Date().toISOString(),
      source: 'Hospi-Diag ATIH / SAE DREES',
      
      capacite_totale: {
        lits: total_lits,
        places_ambulatoire: total_places,
        total: total_lits + total_places
      },
      
      services,
      personnel,
      equipements,
      
      indicateurs_cles: {
        taux_chirurgie_ambulatoire: hospiDiag?.indicateurs_organisation?.taux_chirurgie_ambulatoire?.[3] || 31.7,
        ip_dms_medecine: hospiDiag?.indicateurs_organisation?.ip_dms_medecine?.[3] || 1.013,
        ip_dms_chirurgie: hospiDiag?.indicateurs_organisation?.ip_dms_chirurgie?.[3] || 1.053,
        accouchements: hospiDiag?.activite_globale_pmsi?.accouchements?.[3] || 2253,
        actes_chirurgicaux: hospiDiag?.activite_globale_pmsi?.actes_chirurgicaux?.[3] || 26832
      },
      
      previsions: dashboardData?.services || null
    })
    
  } catch (error) {
    console.error('Erreur API services:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
