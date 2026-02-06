import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dataset = searchParams.get('dataset') || 'etablissement'
    
    const dataDir = path.join(process.cwd(), '..', 'data')
    
    if (dataset === 'etablissement') {
      const content = await fs.readFile(path.join(dataDir, 'etablissement.csv'), 'utf-8')
      const records = parse(content, { columns: true, skip_empty_lines: true }) as Record<string, string>[]
      
      // Agréger par mois pour les graphiques
      const byMonth: Record<string, any> = {}
      const byYear: Record<string, any> = {}
      const byEvent: Record<string, number> = {}
      
      for (const row of records) {
        const month = row.date.substring(0, 7)
        const year = row.date.substring(0, 4)
        
        // Par mois
        if (!byMonth[month]) {
          byMonth[month] = {
            month,
            admissions: 0,
            deces: 0,
            examens: 0,
            taux_occ_medecine: 0,
            taux_occ_chirurgie: 0,
            taux_occ_reanimation: 0,
            personnel_soins_presents: 0,
            personnel_medecins_effectif: 0,
            lits_medecine_total: 0,
            count: 0
          }
        }
        byMonth[month].admissions += parseInt(row.nb_admissions) || 0
        byMonth[month].deces += parseInt(row.nb_deces) || 0
        byMonth[month].examens += parseInt(row.nb_examens_total) || 0
        byMonth[month].taux_occ_medecine += parseFloat(row.taux_occ_medecine) || 0
        byMonth[month].taux_occ_chirurgie += parseFloat(row.taux_occ_chirurgie) || 0
        byMonth[month].taux_occ_reanimation += parseFloat(row.taux_occ_reanimation) || 0
        byMonth[month].personnel_soins_presents += parseInt(row.personnel_soins_presents) || 0
        byMonth[month].personnel_medecins_effectif += parseInt(row.personnel_medecins_effectif) || 0
        byMonth[month].lits_medecine_total += parseInt(row.lits_medecine_total) || 0
        byMonth[month].count += 1
        
        // Par année
        if (!byYear[year]) {
          byYear[year] = {
            year,
            admissions: 0,
            deces: 0,
            personnel_medecins: 0,
            personnel_soins: 0,
            lits_total: 0,
            taux_occ_moyen: 0,
            examens: 0,
            count: 0
          }
        }
        byYear[year].admissions += parseInt(row.nb_admissions) || 0
        byYear[year].deces += parseInt(row.nb_deces) || 0
        byYear[year].personnel_medecins += parseInt(row.personnel_medecins_effectif) || 0
        byYear[year].personnel_soins += parseInt(row.personnel_soins_effectif) || 0
        byYear[year].lits_total += parseInt(row.lits_medecine_total) || 0
        byYear[year].taux_occ_moyen += parseFloat(row.taux_occ_medecine) || 0
        byYear[year].examens += parseInt(row.nb_examens_total) || 0
        byYear[year].count += 1
        
        // Événements
        const event = row.evenement_special || 'normal'
        byEvent[event] = (byEvent[event] || 0) + 1
      }
      
      // Calculer moyennes mensuelles
      const monthlyData = Object.values(byMonth).map((m: any) => ({
        month: m.month,
        admissions: m.admissions,
        admissions_jour: Math.round(m.admissions / m.count),
        deces: m.deces,
        examens: m.examens,
        taux_occ_medecine: Math.round(m.taux_occ_medecine / m.count * 10) / 10,
        taux_occ_chirurgie: Math.round(m.taux_occ_chirurgie / m.count * 10) / 10,
        taux_occ_reanimation: Math.round(m.taux_occ_reanimation / m.count * 10) / 10,
        personnel_soins_moy: Math.round(m.personnel_soins_presents / m.count),
        personnel_medecins: Math.round(m.personnel_medecins_effectif / m.count),
        lits_medecine: Math.round(m.lits_medecine_total / m.count),
      }))
      
      // Calculer moyennes annuelles
      const yearlyData = Object.values(byYear).map((y: any) => ({
        year: y.year,
        admissions_total: y.admissions,
        admissions_jour_moy: Math.round(y.admissions / y.count),
        deces_total: y.deces,
        personnel_medecins: Math.round(y.personnel_medecins / y.count),
        personnel_soins: Math.round(y.personnel_soins / y.count),
        lits_medecine_moy: Math.round(y.lits_total / y.count),
        taux_occ_moyen: Math.round(y.taux_occ_moyen / y.count * 10) / 10,
        examens_total: y.examens,
      })).sort((a, b) => a.year.localeCompare(b.year))
      
      // Stats globales
      const totalAdmissions = records.reduce((sum: number, r: any) => sum + (parseInt(r.nb_admissions) || 0), 0)
      const totalDeces = records.reduce((sum: number, r: any) => sum + (parseInt(r.nb_deces) || 0), 0)
      const avgOccMed = records.reduce((sum: number, r: any) => sum + (parseFloat(r.taux_occ_medecine) || 0), 0) / records.length
      
      // Évolutions
      const years = Object.keys(byYear).sort()
      const firstYear = byYear[years[0]]
      const lastYear = byYear[years[years.length - 1]]
      
      const evolutions = {
        admissions: {
          debut: Math.round(firstYear.admissions / firstYear.count),
          fin: Math.round(lastYear.admissions / lastYear.count),
          variation_pct: (((lastYear.admissions / lastYear.count) / (firstYear.admissions / firstYear.count) - 1) * 100).toFixed(1)
        },
        personnel_medecins: {
          debut: Math.round(firstYear.personnel_medecins / firstYear.count),
          fin: Math.round(lastYear.personnel_medecins / lastYear.count),
          variation_pct: (((lastYear.personnel_medecins / lastYear.count) / (firstYear.personnel_medecins / firstYear.count) - 1) * 100).toFixed(1)
        },
        lits: {
          debut: Math.round(firstYear.lits_total / firstYear.count),
          fin: Math.round(lastYear.lits_total / lastYear.count),
          variation_pct: (((lastYear.lits_total / lastYear.count) / (firstYear.lits_total / firstYear.count) - 1) * 100).toFixed(1)
        }
      }
      
      return NextResponse.json({
        dataset: 'etablissement',
        total_jours: records.length,
        periode: `${records[0].date} - ${records[records.length - 1].date}`,
        stats: {
          total_admissions: totalAdmissions,
          moyenne_admissions_jour: Math.round(totalAdmissions / records.length),
          total_deces: totalDeces,
          taux_mortalite: ((totalDeces / totalAdmissions) * 100).toFixed(3),
          taux_occupation_medecine_moy: avgOccMed.toFixed(1),
        },
        evolutions,
        evenements: byEvent,
        monthly: monthlyData,
        yearly: yearlyData,
        sample: records.slice(0, 5)
      })
    }
    
    if (dataset === 'admissions') {
      // Lire un échantillon (trop gros pour tout charger)
      const content = await fs.readFile(path.join(dataDir, 'admissions_complet.csv'), 'utf-8')
      const lines = content.split('\n')
      const header = lines[0]
      
      // Échantillonner 15000 lignes
      const sampleSize = Math.min(15000, lines.length - 1)
      const step = Math.floor((lines.length - 1) / sampleSize)
      const sampleLines = [header]
      for (let i = 1; i < lines.length && sampleLines.length <= sampleSize; i += step) {
        if (lines[i].trim()) sampleLines.push(lines[i])
      }
      
      const records = parse(sampleLines.join('\n'), { columns: true, skip_empty_lines: true }) as Record<string, string>[]
      
      // Agrégations
      const byModeArrivee: Record<string, number> = {}
      const bySaison: Record<string, number> = {}
      const byEvent: Record<string, number> = {}
      const byTypeLit: Record<string, number> = {}
      const byService: Record<string, number> = {}
      const byYear: Record<string, any> = {}
      const ageDistribution: number[] = []
      
      for (const row of records) {
        const year = row.date_admission?.substring(0, 4)
        
        byModeArrivee[row.mode_arrivee] = (byModeArrivee[row.mode_arrivee] || 0) + 1
        bySaison[row.saison] = (bySaison[row.saison] || 0) + 1
        byEvent[row.evenement_special] = (byEvent[row.evenement_special] || 0) + 1
        if (row.type_lit) byTypeLit[row.type_lit] = (byTypeLit[row.type_lit] || 0) + 1
        byService[row.service] = (byService[row.service] || 0) + 1
        
        const age = parseInt(row.age)
        if (!isNaN(age)) ageDistribution.push(age)
        
        // Par année
        if (year) {
          if (!byYear[year]) {
            byYear[year] = {
              year,
              count: 0,
              age_total: 0,
              duree_total: 0,
              cout_total: 0,
              nb_examens_total: 0
            }
          }
          byYear[year].count++
          byYear[year].age_total += parseInt(row.age) || 0
          byYear[year].duree_total += parseInt(row.duree_sejour) || 0
          byYear[year].cout_total += parseInt(row.cout_sejour) || 0
          byYear[year].nb_examens_total += parseInt(row.nb_examens) || 0
        }
      }
      
      // Distribution âge par tranche
      const ageRanges: Record<string, number> = {
        '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '66-80': 0, '80+': 0
      }
      for (const age of ageDistribution) {
        if (age <= 18) ageRanges['0-18']++
        else if (age <= 35) ageRanges['19-35']++
        else if (age <= 50) ageRanges['36-50']++
        else if (age <= 65) ageRanges['51-65']++
        else if (age <= 80) ageRanges['66-80']++
        else ageRanges['80+']++
      }
      
      // Stats examens
      const avecExamen = records.filter((r: any) => r.a_eu_examen === 'oui').length
      const avgExamens = records.reduce((sum: number, r: any) => sum + (parseInt(r.nb_examens) || 0), 0) / records.length
      
      // Yearly stats
      const yearlyStats = Object.values(byYear).map((y: any) => ({
        year: y.year,
        patients: y.count,
        age_moyen: Math.round(y.age_total / y.count),
        duree_sejour_moy: (y.duree_total / y.count).toFixed(1),
        cout_moyen: Math.round(y.cout_total / y.count),
        examens_par_patient: (y.nb_examens_total / y.count).toFixed(2)
      })).sort((a, b) => a.year.localeCompare(b.year))
      
      return NextResponse.json({
        dataset: 'admissions',
        total_patients: lines.length - 1,
        sample_size: records.length,
        stats: {
          age_moyen: Math.round(ageDistribution.reduce((a, b) => a + b, 0) / ageDistribution.length),
          pct_avec_examen: ((avecExamen / records.length) * 100).toFixed(1),
          nb_examens_moyen: avgExamens.toFixed(1),
          duree_sejour_moy: (records.reduce((sum: number, r: any) => sum + (parseInt(r.duree_sejour) || 0), 0) / records.length).toFixed(1),
        },
        mode_arrivee: byModeArrivee,
        saison: bySaison,
        evenements: byEvent,
        type_lit: byTypeLit,
        service: byService,
        age_distribution: ageRanges,
        yearly: yearlyStats,
        sample: records.slice(0, 5)
      })
    }
    
    return NextResponse.json({ error: 'Dataset inconnu' }, { status: 400 })
    
  } catch (error) {
    console.error('Erreur API explore:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
