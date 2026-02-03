import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), '..', 'data', 'pitie_salpetriere_data.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return NextResponse.json(data);
  } catch (error) {
    // Données par défaut si le fichier n'existe pas
    return NextResponse.json({
      etablissement: {
        nom: "Hôpital Universitaire Pitié-Salpêtrière",
        groupe: "AP-HP",
        categorie: "CHU"
      },
      capacite: {
        lits_et_places: {
          total: 1717,
          medecine: 844,
          chirurgie: 561
        }
      },
      activite_estimee: {
        passages_urgences_jour: 280,
        taux_occupation_moyen_pct: 87.5
      }
    });
  }
}
