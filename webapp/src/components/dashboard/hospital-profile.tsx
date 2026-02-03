'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Bed, 
  Users, 
  Activity, 
  Clock,
  TrendingUp,
  TrendingDown,
  MapPin,
  Phone,
  Award,
  AlertTriangle
} from 'lucide-react';

interface HospitalData {
  etablissement: {
    nom: string;
    groupe: string;
    adresse: string;
    telephone: string;
    categorie: string;
    surface_hectares: number;
    nb_batiments: number;
    nb_services: number;
    nb_poles: number;
  };
  capacite: {
    date_mise_a_jour: string;
    lits_et_places: {
      medecine: number;
      chirurgie: number;
      gyneco_obstetrique: number;
      psychiatrie: number;
      moyen_sejour: number;
      long_sejour: number;
      total: number;
    };
  };
  activite_estimee: {
    passages_urgences_jour: number;
    passages_urgences_annuels: number;
    hospitalisations_jour: number;
    consultations_externes_jour: number;
    taux_occupation_moyen_pct: number;
  };
  taux_occupation_historique: {
    historique: Record<string, number>;
    par_service_2024: Record<string, number>;
  };
  personnel: {
    effectifs: {
      medecins_hospitalo_universitaires: number;
      medecins_praticiens_hospitaliers: number;
      internes: number;
      infirmiers: number;
      aides_soignants: number;
      administratifs: number;
      total: number;
    };
    ratio_personnel_lit: number;
  };
  specialites_excellence: string[];
  urgences: {
    temps_attente_median_min: number;
    taux_hospitalisation_urgences_pct: number;
  };
  contexte_ap_hp: {
    lits_fermes_2018_2022: number;
    lits_rouverts_fin_2023: number;
    tendance: string;
  };
}

export function HospitalProfile() {
  const [data, setData] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hospital')
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

  const lits = data.capacite.lits_et_places;
  const pers = data.personnel?.effectifs;
  const occ = data.taux_occupation_historique;

  return (
    <div className="space-y-6">
      {/* En-tête établissement */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                {data.etablissement.nom}
              </CardTitle>
              <CardDescription className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100">{data.etablissement.groupe}</Badge>
                  <Badge variant="outline">{data.etablissement.categorie}</Badge>
                </div>
                <div className="flex items-center gap-1 text-sm mt-2">
                  <MapPin className="h-4 w-4" />
                  {data.etablissement.adresse}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Phone className="h-4 w-4" />
                  {data.etablissement.telephone}
                </div>
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>1er groupe hospitalier français</p>
              <p>{data.etablissement.surface_hectares} hectares • {data.etablissement.nb_batiments} bâtiments</p>
              <p>{data.etablissement.nb_services} services • {data.etablissement.nb_poles} pôles</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Bed className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Capacité totale</span>
            </div>
            <p className="text-3xl font-bold">{lits.total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">lits et places</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Urgences/jour</span>
            </div>
            <p className="text-3xl font-bold">{data.activite_estimee.passages_urgences_jour}</p>
            <p className="text-xs text-muted-foreground">passages estimés</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Taux occupation</span>
            </div>
            <p className="text-3xl font-bold">{data.activite_estimee.taux_occupation_moyen_pct}%</p>
            <p className="text-xs text-muted-foreground">moyenne 2024</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Personnel</span>
            </div>
            <p className="text-3xl font-bold">{pers?.total?.toLocaleString() || '~8000'}</p>
            <p className="text-xs text-muted-foreground">agents</p>
          </CardContent>
        </Card>
      </div>

      {/* Détail capacité et occupation */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Répartition des lits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bed className="h-5 w-5" />
              Répartition des Lits
            </CardTitle>
            <CardDescription>
              Source: FHF - Données janvier 2019
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Médecine', value: lits.medecine, color: 'bg-blue-500' },
              { label: 'Chirurgie', value: lits.chirurgie, color: 'bg-green-500' },
              { label: 'Psychiatrie', value: lits.psychiatrie, color: 'bg-purple-500' },
              { label: 'Moyen séjour', value: lits.moyen_sejour, color: 'bg-orange-500' },
              { label: 'Gynéco-obstétrique', value: lits.gyneco_obstetrique, color: 'bg-pink-500' },
              { label: 'Long séjour', value: lits.long_sejour, color: 'bg-gray-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value} lits ({((item.value / lits.total) * 100).toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color}`} 
                    style={{ width: `${(item.value / lits.medecine) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Taux d'occupation par service */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Taux d&apos;Occupation par Service
            </CardTitle>
            <CardDescription>
              Estimations 2024 basées sur données AP-HP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {occ?.par_service_2024 && Object.entries(occ.par_service_2024).map(([service, taux]) => {
              const isOverloaded = taux > 95;
              const isHigh = taux > 85;
              
              return (
                <div key={service} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{service}</span>
                    <span className={`font-medium ${isOverloaded ? 'text-red-600' : isHigh ? 'text-orange-600' : 'text-green-600'}`}>
                      {taux}%
                      {isOverloaded && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(taux, 100)} 
                    className={`h-2 ${isOverloaded ? '[&>div]:bg-red-500' : isHigh ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Évolution historique et contexte */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Évolution occupation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Évolution du Taux d&apos;Occupation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-2">
              {occ?.historique && Object.entries(occ.historique).map(([year, rate]) => (
                <div key={year} className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-full rounded-t ${rate > 85 ? 'bg-orange-500' : 'bg-blue-500'}`}
                    style={{ height: `${rate}%` }}
                  />
                  <span className="text-xs mt-1">{year}</span>
                  <span className="text-xs font-medium">{rate}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Baisse 2020 due au COVID, remontée progressive depuis
            </p>
          </CardContent>
        </Card>

        {/* Contexte AP-HP */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Contexte AP-HP (2018-2024)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-2xl font-bold">{data.contexte_ap_hp?.lits_fermes_2018_2022?.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">lits fermés (2018-2022)</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-2xl font-bold">+{data.contexte_ap_hp?.lits_rouverts_fin_2023}</span>
                </div>
                <p className="text-xs text-muted-foreground">lits rouverts (fin 2023)</p>
              </div>
            </div>
            <p className="text-sm text-orange-700">
              <strong>Tendance:</strong> {data.contexte_ap_hp?.tendance}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spécialités d'excellence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Spécialités d&apos;Excellence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.specialites_excellence?.map((spec) => (
              <Badge key={spec} variant="secondary" className="px-3 py-1">
                {spec}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Note sur les données */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Sources:</strong> FHF (capacité 2019), AP-HP (rapports 2023-2024), DREES (taux occupation nationaux), 
            estimations basées sur moyennes CHU et données publiques. Certaines données sont des estimations 
            en l&apos;absence de publications récentes détaillées par établissement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
