'use client';

import { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { 
  Bed, 
  Users, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Stethoscope,
  Heart,
  Zap,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface ResourcePrediction {
  date: string;
  admissions_prevues: number;
  lits: {
    [key: string]: {
      lits_necessaires: number;
      capacite_actuelle: number;
      taux_utilisation_prevu: number;
      alerte?: boolean;
      critique?: boolean;
    };
  };
  personnel: {
    [key: string]: {
      effectif_necessaire: number;
      effectif_avec_marge: number;
      effectif_disponible: number;
      taux_mobilisation: number;
      alerte?: boolean;
      critique?: boolean;
    };
  };
  equipements: {
    [key: string]: {
      examens_prevus: number;
      capacite_jour: number;
      taux_utilisation: number;
      alerte?: boolean;
    };
  };
  alertes: {
    lits: boolean;
    personnel: boolean;
    equipements: boolean;
  };
  niveau_risque: number;
}

interface ResourceData {
  generated_at: string;
  horizon_jours: number;
  daily: ResourcePrediction[];
  summary: {
    admissions_moyenne: number;
    admissions_max: number;
    jours_alerte_lits: number;
    jours_alerte_personnel: number;
    jours_alerte_equipements: number;
    risque_moyen: number;
  };
  recommendations: Array<{
    type: string;
    priorite: string;
    titre: string;
    description: string;
    action: string;
  }>;
}

const COLORS = {
  medecine: '#3b82f6',
  chirurgie: '#22c55e',
  reanimation: '#ef4444',
  soins_intensifs: '#f97316',
  urgences: '#8b5cf6',
  obstetrique: '#ec4899',
};

export default function ResourcePredictionsPage() {
  const [data, setData] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState(30);
  
  // Toggles pour les graphiques
  const [visibleLits, setVisibleLits] = useState({
    medecine: true,
    chirurgie: true,
    reanimation: true,
    soins_intensifs: true,
    urgences: true,
    obstetrique: true,
  });
  const [visiblePersonnel, setVisiblePersonnel] = useState({
    medecins: true,
    infirmiers: true,
    aides_soignants: true,
  });
  const [visibleEquipements, setVisibleEquipements] = useState({
    scanner: true,
    irm: true,
    bloc: true,
  });

  useEffect(() => {
    fetch(`/api/predictions/resources?days=${horizon}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [horizon]);

  if (loading) {
    return (
      <PageWrapper title="Prédictions des Ressources" description="Chargement...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </PageWrapper>
    );
  }

  if (!data) {
    return (
      <PageWrapper title="Prédictions des Ressources" description="Erreur">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">Impossible de charger les prédictions de ressources.</p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  const getRiskColor = (risk: number) => {
    if (risk >= 4) return 'bg-red-500';
    if (risk >= 3) return 'bg-orange-500';
    if (risk >= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 4) return 'Critique';
    if (risk >= 3) return 'Élevé';
    if (risk >= 2) return 'Modéré';
    return 'Faible';
  };

  // Préparer données pour graphiques
  const chartData = data.daily.map(d => ({
    date: d.date.slice(5), // MM-DD
    admissions: d.admissions_prevues,
    lits_medecine: d.lits.medecine?.taux_utilisation_prevu || 0,
    lits_chirurgie: d.lits.chirurgie?.taux_utilisation_prevu || 0,
    lits_reanimation: d.lits.reanimation?.taux_utilisation_prevu || 0,
    lits_soins_intensifs: d.lits.soins_intensifs?.taux_utilisation_prevu || 0,
    lits_urgences: d.lits.urgences?.taux_utilisation_prevu || 0,
    lits_obstetrique: d.lits.obstetrique?.taux_utilisation_prevu || 0,
    medecins: d.personnel.medecins?.taux_mobilisation || 0,
    infirmiers: d.personnel.infirmiers?.taux_mobilisation || 0,
    aides_soignants: d.personnel.aides_soignants?.taux_mobilisation || 0,
    scanner: d.equipements.scanner?.taux_utilisation || 0,
    irm: d.equipements.irm?.taux_utilisation || 0,
    bloc: d.equipements.bloc?.taux_utilisation || 0,
    risque: d.niveau_risque,
  }));

  const toggleLit = (key: keyof typeof visibleLits) => {
    setVisibleLits(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePersonnel = (key: keyof typeof visiblePersonnel) => {
    setVisiblePersonnel(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEquipement = (key: keyof typeof visibleEquipements) => {
    setVisibleEquipements(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Premier jour détaillé
  const today = data.daily[0];

  return (
    <PageWrapper
      title="Prédictions des Ressources"
      description={`Besoins en lits, personnel et équipements pour les ${horizon} prochains jours`}
    >
      {/* Résumé */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Horizon</p>
            <p className="text-2xl font-bold">{data.horizon_jours}j</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Admissions moy.</p>
            <p className="text-2xl font-bold">{data.summary.admissions_moyenne}</p>
          </CardContent>
        </Card>
        <Card className={data.summary.jours_alerte_lits > 5 ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Alertes Lits</p>
            <p className="text-2xl font-bold">{data.summary.jours_alerte_lits}j</p>
          </CardContent>
        </Card>
        <Card className={data.summary.jours_alerte_personnel > 3 ? 'border-orange-300 bg-orange-50' : ''}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Alertes Personnel</p>
            <p className="text-2xl font-bold">{data.summary.jours_alerte_personnel}j</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Alertes Équip.</p>
            <p className="text-2xl font-bold">{data.summary.jours_alerte_equipements}j</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Risque moyen</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{data.summary.risque_moyen}</span>
              <Badge className={getRiskColor(data.summary.risque_moyen)}>/5</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lits" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="lits" className="flex items-center gap-2">
            <Bed className="h-4 w-4" />
            Lits
          </TabsTrigger>
          <TabsTrigger value="personnel" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Personnel
          </TabsTrigger>
          <TabsTrigger value="equipements" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Équipements
          </TabsTrigger>
          <TabsTrigger value="alertes" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertes
          </TabsTrigger>
        </TabsList>

        {/* LITS */}
        <TabsContent value="lits" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Prévision d&apos;Occupation des Lits</CardTitle>
                  <CardDescription>Taux d&apos;utilisation prévu par service sur {horizon} jours</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries({
                    medecine: { label: 'Médecine', color: COLORS.medecine },
                    chirurgie: { label: 'Chirurgie', color: COLORS.chirurgie },
                    reanimation: { label: 'Réanimation', color: COLORS.reanimation },
                    soins_intensifs: { label: 'Soins Int.', color: COLORS.soins_intensifs },
                    urgences: { label: 'Urgences', color: COLORS.urgences },
                    obstetrique: { label: 'Obstétrique', color: COLORS.obstetrique },
                  }).map(([key, { label, color }]) => (
                    <Button
                      key={key}
                      variant={visibleLits[key as keyof typeof visibleLits] ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleLit(key as keyof typeof visibleLits)}
                      style={{ 
                        backgroundColor: visibleLits[key as keyof typeof visibleLits] ? color : 'transparent',
                        borderColor: color,
                        color: visibleLits[key as keyof typeof visibleLits] ? 'white' : color,
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 120]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    {visibleLits.medecine && <Line type="monotone" dataKey="lits_medecine" name="Médecine" stroke={COLORS.medecine} strokeWidth={2} dot={false} />}
                    {visibleLits.chirurgie && <Line type="monotone" dataKey="lits_chirurgie" name="Chirurgie" stroke={COLORS.chirurgie} strokeWidth={2} dot={false} />}
                    {visibleLits.reanimation && <Line type="monotone" dataKey="lits_reanimation" name="Réanimation" stroke={COLORS.reanimation} strokeWidth={2} dot={false} />}
                    {visibleLits.soins_intensifs && <Line type="monotone" dataKey="lits_soins_intensifs" name="Soins Intensifs" stroke={COLORS.soins_intensifs} strokeWidth={2} dot={false} />}
                    {visibleLits.urgences && <Line type="monotone" dataKey="lits_urgences" name="Urgences" stroke={COLORS.urgences} strokeWidth={2} dot={false} />}
                    {visibleLits.obstetrique && <Line type="monotone" dataKey="lits_obstetrique" name="Obstétrique" stroke={COLORS.obstetrique} strokeWidth={2} dot={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Graphique en aires empilées */}
          <Card>
            <CardHeader>
              <CardTitle>Vue d&apos;ensemble - Aires empilées</CardTitle>
              <CardDescription>Occupation cumulée des services sélectionnés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    {visibleLits.medecine && <Area type="monotone" dataKey="lits_medecine" name="Médecine" fill={COLORS.medecine} stroke={COLORS.medecine} fillOpacity={0.6} stackId="1" />}
                    {visibleLits.chirurgie && <Area type="monotone" dataKey="lits_chirurgie" name="Chirurgie" fill={COLORS.chirurgie} stroke={COLORS.chirurgie} fillOpacity={0.6} stackId="1" />}
                    {visibleLits.reanimation && <Area type="monotone" dataKey="lits_reanimation" name="Réanimation" fill={COLORS.reanimation} stroke={COLORS.reanimation} fillOpacity={0.6} stackId="1" />}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Détail J+1 */}
          {today && (
            <Card>
              <CardHeader>
                <CardTitle>Détail J+1 ({today.date})</CardTitle>
                <CardDescription>Besoins en lits pour demain ({today.admissions_prevues} admissions prévues)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(today.lits).filter(([k]) => k !== 'total').map(([type, data]) => (
                    <div key={type} className={`p-4 rounded-lg border ${data.critique ? 'border-red-300 bg-red-50' : data.alerte ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold capitalize">{type.replace('_', ' ')}</span>
                        {data.critique ? (
                          <Badge variant="destructive">Critique</Badge>
                        ) : data.alerte ? (
                          <Badge className="bg-orange-500">Alerte</Badge>
                        ) : (
                          <Badge className="bg-green-500">OK</Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Nécessaires</span>
                          <span className="font-bold">{data.lits_necessaires}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Disponibles</span>
                          <span>{data.capacite_actuelle}</span>
                        </div>
                        <Progress 
                          value={Math.min(100, data.taux_utilisation_prevu)} 
                          className={`h-2 ${data.critique ? '[&>div]:bg-red-500' : data.alerte ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                        />
                        <p className="text-xs text-muted-foreground text-right">{data.taux_utilisation_prevu}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PERSONNEL */}
        <TabsContent value="personnel" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Prévision des Besoins en Personnel</CardTitle>
                  <CardDescription>Taux de mobilisation prévu sur {horizon} jours</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={visiblePersonnel.medecins ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePersonnel('medecins')}
                    style={{ 
                      backgroundColor: visiblePersonnel.medecins ? '#3b82f6' : 'transparent',
                      borderColor: '#3b82f6',
                      color: visiblePersonnel.medecins ? 'white' : '#3b82f6',
                    }}
                  >
                    Médecins
                  </Button>
                  <Button
                    variant={visiblePersonnel.infirmiers ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePersonnel('infirmiers')}
                    style={{ 
                      backgroundColor: visiblePersonnel.infirmiers ? '#22c55e' : 'transparent',
                      borderColor: '#22c55e',
                      color: visiblePersonnel.infirmiers ? 'white' : '#22c55e',
                    }}
                  >
                    Infirmiers
                  </Button>
                  <Button
                    variant={visiblePersonnel.aides_soignants ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePersonnel('aides_soignants')}
                    style={{ 
                      backgroundColor: visiblePersonnel.aides_soignants ? '#f97316' : 'transparent',
                      borderColor: '#f97316',
                      color: visiblePersonnel.aides_soignants ? 'white' : '#f97316',
                    }}
                  >
                    Aides-soignants
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    {visiblePersonnel.medecins && <Line type="monotone" dataKey="medecins" name="Médecins" stroke="#3b82f6" strokeWidth={2} dot={false} />}
                    {visiblePersonnel.infirmiers && <Line type="monotone" dataKey="infirmiers" name="Infirmiers" stroke="#22c55e" strokeWidth={2} dot={false} />}
                    {visiblePersonnel.aides_soignants && <Line type="monotone" dataKey="aides_soignants" name="Aides-soignants" stroke="#f97316" strokeWidth={2} dot={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Graphique barres comparatif */}
          <Card>
            <CardHeader>
              <CardTitle>Comparaison Besoin vs Disponible</CardTitle>
              <CardDescription>Effectifs sur les 14 prochains jours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.slice(0, 14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="medecins" name="Médecins" fill="#3b82f6" />
                    <Bar dataKey="infirmiers" name="Infirmiers" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {today && (
            <Card>
              <CardHeader>
                <CardTitle>Détail J+1 ({today.date})</CardTitle>
                <CardDescription>Effectifs nécessaires pour demain</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(today.personnel).map(([type, data]) => (
                    <div key={type} className={`p-4 rounded-lg border ${data.critique ? 'border-red-300 bg-red-50' : data.alerte ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold capitalize">{type.replace('_', ' ')}</span>
                        {data.critique ? (
                          <Badge variant="destructive">Déficit</Badge>
                        ) : data.alerte ? (
                          <Badge className="bg-orange-500">Tendu</Badge>
                        ) : (
                          <Badge className="bg-green-500">OK</Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Nécessaires (+ marge)</span>
                          <span className="font-bold">{data.effectif_avec_marge}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Disponibles</span>
                          <span>{data.effectif_disponible}</span>
                        </div>
                        <Progress 
                          value={Math.min(100, data.taux_mobilisation)} 
                          className={`h-2 ${data.critique ? '[&>div]:bg-red-500' : data.alerte ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                        />
                        <p className="text-xs text-muted-foreground text-right">{data.taux_mobilisation}% mobilisés</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ÉQUIPEMENTS */}
        <TabsContent value="equipements" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Prévision d&apos;Utilisation des Équipements</CardTitle>
                  <CardDescription>Taux d&apos;utilisation prévu sur {horizon} jours</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={visibleEquipements.scanner ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleEquipement('scanner')}
                    style={{ 
                      backgroundColor: visibleEquipements.scanner ? '#3b82f6' : 'transparent',
                      borderColor: '#3b82f6',
                      color: visibleEquipements.scanner ? 'white' : '#3b82f6',
                    }}
                  >
                    Scanner
                  </Button>
                  <Button
                    variant={visibleEquipements.irm ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleEquipement('irm')}
                    style={{ 
                      backgroundColor: visibleEquipements.irm ? '#22c55e' : 'transparent',
                      borderColor: '#22c55e',
                      color: visibleEquipements.irm ? 'white' : '#22c55e',
                    }}
                  >
                    IRM
                  </Button>
                  <Button
                    variant={visibleEquipements.bloc ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleEquipement('bloc')}
                    style={{ 
                      backgroundColor: visibleEquipements.bloc ? '#8b5cf6' : 'transparent',
                      borderColor: '#8b5cf6',
                      color: visibleEquipements.bloc ? 'white' : '#8b5cf6',
                    }}
                  >
                    Bloc Op.
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="right" dataKey="admissions" name="Admissions" fill="#e5e7eb" />
                    {visibleEquipements.scanner && <Line yAxisId="left" type="monotone" dataKey="scanner" name="Scanner" stroke="#3b82f6" strokeWidth={2} />}
                    {visibleEquipements.irm && <Line yAxisId="left" type="monotone" dataKey="irm" name="IRM" stroke="#22c55e" strokeWidth={2} />}
                    {visibleEquipements.bloc && <Line yAxisId="left" type="monotone" dataKey="bloc" name="Bloc Op." stroke="#8b5cf6" strokeWidth={2} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Graphique barres capacité */}
          <Card>
            <CardHeader>
              <CardTitle>Charge des équipements (14 jours)</CardTitle>
              <CardDescription>Taux d&apos;utilisation journalier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.slice(0, 14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    {visibleEquipements.scanner && <Bar dataKey="scanner" name="Scanner" fill="#3b82f6" />}
                    {visibleEquipements.irm && <Bar dataKey="irm" name="IRM" fill="#22c55e" />}
                    {visibleEquipements.bloc && <Bar dataKey="bloc" name="Bloc Op." fill="#8b5cf6" />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {today && (
            <Card>
              <CardHeader>
                <CardTitle>Détail J+1 ({today.date})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(today.equipements).map(([type, data]) => (
                    <div key={type} className={`p-4 rounded-lg border ${data.alerte ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold capitalize">{type.replace('_', ' ')}</span>
                        {data.alerte ? (
                          <Badge className="bg-orange-500">Saturé</Badge>
                        ) : (
                          <Badge className="bg-green-500">OK</Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Examens prévus</span>
                          <span className="font-bold">{data.examens_prevus}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Capacité/jour</span>
                          <span>{data.capacite_jour}</span>
                        </div>
                        <Progress 
                          value={Math.min(100, data.taux_utilisation)} 
                          className={`h-2 ${data.alerte ? '[&>div]:bg-orange-500' : '[&>div]:bg-blue-500'}`}
                        />
                        <p className="text-xs text-muted-foreground text-right">{data.taux_utilisation}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ALERTES ET RECOMMANDATIONS */}
        <TabsContent value="alertes" className="space-y-6">
          {/* Niveau de risque par jour */}
          <Card>
            <CardHeader>
              <CardTitle>Niveau de Risque par Jour</CardTitle>
              <CardDescription>Score de risque global (1-5)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Bar dataKey="risque" name="Niveau de risque">
                      {chartData.map((entry, index) => (
                        <rect
                          key={`bar-${index}`}
                          fill={entry.risque >= 4 ? '#ef4444' : entry.risque >= 3 ? '#f97316' : entry.risque >= 2 ? '#eab308' : '#22c55e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recommandations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Recommandations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recommendations && data.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {data.recommendations.map((rec, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-lg border-l-4 ${
                        rec.priorite === 'critique' ? 'border-l-red-500 bg-red-50' :
                        rec.priorite === 'haute' ? 'border-l-orange-500 bg-orange-50' :
                        'border-l-yellow-500 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={
                          rec.priorite === 'critique' ? 'bg-red-500' :
                          rec.priorite === 'haute' ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }>
                          {rec.priorite.toUpperCase()}
                        </Badge>
                        <span className="font-semibold">{rec.titre}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <p className="text-sm font-medium">→ {rec.action}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Aucune alerte majeure pour la période.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tableau des alertes */}
          <Card>
            <CardHeader>
              <CardTitle>Détail des Alertes par Jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-right">Admissions</th>
                      <th className="p-2 text-center">Lits</th>
                      <th className="p-2 text-center">Personnel</th>
                      <th className="p-2 text-center">Équipements</th>
                      <th className="p-2 text-center">Risque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.slice(0, 14).map((day, idx) => (
                      <tr key={idx} className={`border-b ${day.niveau_risque >= 4 ? 'bg-red-50' : day.niveau_risque >= 3 ? 'bg-orange-50' : ''}`}>
                        <td className="p-2">{day.date}</td>
                        <td className="p-2 text-right font-medium">{day.admissions_prevues}</td>
                        <td className="p-2 text-center">
                          {day.alertes.lits ? <XCircle className="h-4 w-4 text-red-500 mx-auto" /> : <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />}
                        </td>
                        <td className="p-2 text-center">
                          {day.alertes.personnel ? <XCircle className="h-4 w-4 text-red-500 mx-auto" /> : <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />}
                        </td>
                        <td className="p-2 text-center">
                          {day.alertes.equipements ? <XCircle className="h-4 w-4 text-orange-500 mx-auto" /> : <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />}
                        </td>
                        <td className="p-2 text-center">
                          <Badge className={getRiskColor(day.niveau_risque)}>{day.niveau_risque}/5</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
