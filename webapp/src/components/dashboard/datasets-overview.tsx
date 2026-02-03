'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Building, 
  FileText,
  ExternalLink,
  Calendar,
  Users,
  Bed,
  AlertTriangle
} from 'lucide-react';

interface DatasetsAnalysis {
  generated_at: string;
  datasets: {
    lits_soins_critiques?: {
      source: string;
      derniere_annee: number;
      total_france: number;
    };
    evolution_lits_france?: {
      source: string;
      periode: string;
      evolution_lits_complets_pct: number;
      lits_2024: number;
      places_2024: number;
      tendance_annuelle_lits: number;
    };
    covid_hospitalisations?: {
      source: string;
      periode: string;
      paris_75: {
        total_hospitalisations: number;
        max_hosp_jour: number;
        date_pic: string;
      };
      france: {
        max_hosp_jour: number;
        date_pic: string;
      };
    };
    urgences_covid_sursaud?: {
      source: string;
      nb_lignes: number;
    };
    grippe_sentinelles?: {
      source: string;
      semaines_pic: number[];
    };
  };
  pitie_salpetriere?: {
    nom: string;
    caracteristiques: {
      lits_estimes: number;
    };
    activite_estimee: {
      passages_urgences_jour: number;
      admissions_jour: number;
    };
    personnel_estime: {
      total: number;
    };
  };
  summary: {
    nb_datasets: number;
    sources: string[];
    couverture_temporelle: string;
  };
}

export function DatasetsOverview() {
  const [data, setData] = useState<DatasetsAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/datasets')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des données...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const datasets = [
    {
      id: 'lits_critiques',
      name: 'Lits de Soins Critiques',
      source: 'DREES - SAE',
      icon: Bed,
      color: 'bg-red-100 text-red-700',
      stat: `${data.datasets.lits_soins_critiques?.total_france?.toLocaleString()} lits`,
      description: 'Réanimation, soins intensifs et surveillance continue en France',
      url: 'https://data.drees.solidarites-sante.gouv.fr'
    },
    {
      id: 'evolution_lits',
      name: 'Évolution Capacités France',
      source: 'DREES',
      icon: TrendingDown,
      color: 'bg-orange-100 text-orange-700',
      stat: `${data.datasets.evolution_lits_france?.evolution_lits_complets_pct}% depuis 2013`,
      description: `${Math.abs(data.datasets.evolution_lits_france?.tendance_annuelle_lits || 0).toLocaleString()} lits perdus/an`,
      url: 'https://data.drees.solidarites-sante.gouv.fr'
    },
    {
      id: 'covid',
      name: 'Hospitalisations COVID',
      source: 'Santé Publique France',
      icon: Activity,
      color: 'bg-purple-100 text-purple-700',
      stat: `${data.datasets.covid_hospitalisations?.paris_75?.total_hospitalisations?.toLocaleString()} hosp. Paris`,
      description: `Pic: ${data.datasets.covid_hospitalisations?.france?.max_hosp_jour?.toLocaleString()}/jour (France)`,
      url: 'https://www.data.gouv.fr/fr/datasets/donnees-hospitalieres-relatives-a-lepidemie-de-covid-19/'
    },
    {
      id: 'urgences',
      name: 'Passages Urgences (SurSaud)',
      source: 'Santé Publique France',
      icon: AlertTriangle,
      color: 'bg-blue-100 text-blue-700',
      stat: `${data.datasets.urgences_covid_sursaud?.nb_lignes?.toLocaleString()} entrées`,
      description: 'Passages quotidiens par département, âge et sexe',
      url: 'https://www.data.gouv.fr/fr/datasets/donnees-des-urgences-hospitalieres/'
    },
    {
      id: 'grippe',
      name: 'Incidence Grippe',
      source: 'Réseau Sentinelles - INSERM',
      icon: Calendar,
      color: 'bg-green-100 text-green-700',
      stat: '42 ans de données',
      description: `Pic: semaines ${data.datasets.grippe_sentinelles?.semaines_pic?.slice(0, 3).join(', ')}...`,
      url: 'https://www.sentiweb.fr'
    }
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Sources de Données
          </h2>
          <p className="text-muted-foreground">
            Données réelles utilisées pour calibrer nos modèles
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50">
          {data.summary.nb_datasets} datasets • {data.summary.couverture_temporelle}
        </Badge>
      </div>

      {/* Grille des datasets */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((ds) => (
          <Card key={ds.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${ds.color}`}>
                  <ds.icon className="h-5 w-5" />
                </div>
                <a 
                  href={ds.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-blue-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <CardTitle className="text-base mt-2">{ds.name}</CardTitle>
              <CardDescription className="text-xs">{ds.source}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{ds.stat}</p>
              <p className="text-sm text-muted-foreground mt-1">{ds.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Focus Pitié-Salpêtrière */}
      {data.pitie_salpetriere && (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              {data.pitie_salpetriere.nom}
            </CardTitle>
            <CardDescription>
              Estimations basées sur données AP-HP et moyennes CHU
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border">
                <Bed className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{data.pitie_salpetriere.caracteristiques.lits_estimes}</p>
                <p className="text-xs text-muted-foreground">Lits estimés</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <Activity className="h-5 w-5 mx-auto text-red-500 mb-1" />
                <p className="text-2xl font-bold">{data.pitie_salpetriere.activite_estimee.passages_urgences_jour}</p>
                <p className="text-xs text-muted-foreground">Urgences/jour</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-2xl font-bold">{data.pitie_salpetriere.activite_estimee.admissions_jour}</p>
                <p className="text-xs text-muted-foreground">Admissions/jour</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <Users className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                <p className="text-2xl font-bold">{data.pitie_salpetriere.personnel_estime.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Personnel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights clés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Insights Clés des Données Réelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2">⚠️ Tension Capacitaire</h4>
              <p className="text-sm text-orange-700">
                La France a perdu <strong>45,000 lits</strong> entre 2013 et 2024 (-11%), 
                soit ~4,100 lits/an. Les places ambulatoires ont augmenté de +35%.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-2">🦠 Impact COVID</h4>
              <p className="text-sm text-purple-700">
                Pic Paris: <strong>404 hospitalisations/jour</strong> (31 mars 2020).
                Pic France: <strong>4,281/jour</strong> (1er avril 2020). 
                Total Paris: 48,776 hospitalisations.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">🤒 Saisonnalité Grippe</h4>
              <p className="text-sm text-green-700">
                42 ans de données Sentinelles montrent des pics constants 
                <strong> semaines 1 à 8</strong> (janvier-février). 
                Incidence jusqu&apos;à 800 cas/100k/semaine.
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">🏥 Soins Critiques</h4>
              <p className="text-sm text-blue-700">
                <strong>13,812 lits</strong> de soins critiques en France (2024) : 
                réanimation, soins intensifs et surveillance continue.
                Essentiellement dans le secteur public.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
