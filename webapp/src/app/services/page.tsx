'use client';

import { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Area,
  AreaChart,
} from 'recharts';
import { Bed, Users, Activity, AlertTriangle, Building2 } from 'lucide-react';

type Service = {
  id: string;
  nom: string;
  lits: number;
  places_ambu: number;
  taux_occupation: number;
  evolution_lits: number[];
  admissions_2023: number | null;
  admissions_ambu_2023?: number | null;
  couleur: string;
};

type ServicesData = {
  etablissement: string;
  annees: number[];
  capacite_totale: {
    lits: number;
    places_ambulatoire: number;
    total: number;
  };
  services: Service[];
  personnel: {
    etp_medicaux: number;
    etp_non_medicaux: number;
    etp_soins: number;
    evolution: number[];
    // Détail médicaux
    medecins: number;
    chirurgiens: number;
    anesthesistes: number;
    gyneco_obstetriciens: number;
    // Détail non-médicaux
    administratifs: number;
    soins: number;
    medico_techniques: number;
    educatifs_sociaux: number;
    techniques_ouvriers: number;
    // Évolutions
    evolution_medicaux: number[];
    evolution_soins: number[];
  };
  equipements: {
    scanners: number;
    irm: number;
    salles_bloc: number;
    tep_scan: number;
  };
  indicateurs_cles: {
    taux_chirurgie_ambulatoire: number;
    ip_dms_medecine: number;
    ip_dms_chirurgie: number;
    accouchements: number;
    actes_chirurgicaux: number;
  };
};

export default function ServicesPage() {
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <PageWrapper title="Services" description="Chargement...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </PageWrapper>
    );
  }

  if (!data) {
    return (
      <PageWrapper title="Services" description="Erreur de chargement">
        <div className="text-center text-red-500 p-8">Impossible de charger les données</div>
      </PageWrapper>
    );
  }

  const getOccupationColor = (taux: number) => {
    if (taux >= 95) return 'text-red-600 bg-red-50';
    if (taux >= 85) return 'text-orange-600 bg-orange-50';
    if (taux >= 70) return 'text-green-600 bg-green-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getOccupationBadge = (taux: number) => {
    if (taux >= 95) return <Badge variant="destructive">Critique</Badge>;
    if (taux >= 85) return <Badge className="bg-orange-500">Tension</Badge>;
    if (taux >= 70) return <Badge className="bg-green-500">Normal</Badge>;
    return <Badge variant="secondary">Sous-utilisé</Badge>;
  };

  // Données pour graphique évolution
  const evolutionData = data.annees.map((annee, idx) => {
    const point: Record<string, number | string> = { annee: annee.toString() };
    data.services.forEach((service) => {
      point[service.nom] = service.evolution_lits[idx];
    });
    return point;
  });

  return (
    <PageWrapper
      title="Capacités par Service"
      description="Vue détaillée des lits, places et prévisions par service"
    >
      {/* Résumé global */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Bed className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lits installés</p>
                <p className="text-2xl font-bold">{data.capacite_totale.lits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Places ambulatoire</p>
                <p className="text-2xl font-bold">{data.capacite_totale.places_ambulatoire}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ETP Personnel soins</p>
                <p className="text-2xl font-bold">{Math.round(data.personnel.etp_soins).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Building2 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Salles de bloc</p>
                <p className="text-2xl font-bold">{data.equipements.salles_bloc}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lits" className="space-y-6">
        <TabsList>
          <TabsTrigger value="lits">Lits par service</TabsTrigger>
          <TabsTrigger value="evolution">Évolution 2020-2023</TabsTrigger>
          <TabsTrigger value="occupation">Taux d&apos;occupation</TabsTrigger>
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
        </TabsList>

        <TabsContent value="lits">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.services.map((service) => (
                <Card
                  key={service.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedService === service.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() =>
                    setSelectedService(selectedService === service.id ? null : service.id)
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: service.couleur }}
                        />
                        {service.nom}
                      </CardTitle>
                      {getOccupationBadge(service.taux_occupation)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Lits */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Lits installés</span>
                        <span className="text-xl font-bold">{service.lits}</span>
                      </div>

                      {/* Places ambu */}
                      {service.places_ambu > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Places ambulatoire</span>
                          <span className="font-semibold text-green-600">+{service.places_ambu}</span>
                        </div>
                      )}

                      {/* Taux occupation */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Occupation</span>
                          <span className={`font-semibold ${getOccupationColor(service.taux_occupation).split(' ')[0]}`}>
                            {service.taux_occupation.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={Math.min(service.taux_occupation, 100)}
                          className="h-2"
                        />
                      </div>

                      {/* Admissions */}
                      {service.admissions_2023 && (
                        <div className="text-xs text-gray-500 pt-1">
                          {service.admissions_2023.toLocaleString()} séjours HC en 2023
                          {service.admissions_ambu_2023 && (
                            <span className="text-green-600">
                              {' '}+ {service.admissions_ambu_2023.toLocaleString()} ambu
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>

          {/* Alertes */}
          <Card className="mt-6 border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Points d&apos;attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.services
                  .filter((s) => s.taux_occupation >= 95)
                  .map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-red-700">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      <strong>{s.nom}</strong>: Surcharge critique ({s.taux_occupation.toFixed(1)}%)
                    </li>
                  ))}
                {data.services
                  .filter((s) => {
                    const evol = ((s.evolution_lits[3] - s.evolution_lits[0]) / s.evolution_lits[0]) * 100;
                    return evol < -20;
                  })
                  .map((s) => {
                    const evol = ((s.evolution_lits[3] - s.evolution_lits[0]) / s.evolution_lits[0]) * 100;
                    return (
                      <li key={`evol-${s.id}`} className="flex items-center gap-2 text-orange-700">
                        <span className="w-2 h-2 bg-orange-500 rounded-full" />
                        <strong>{s.nom}</strong>: Forte réduction de capacité ({evol.toFixed(0)}% depuis 2020)
                      </li>
                    );
                  })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des lits installés (2020-2023)</CardTitle>
              <CardDescription>
                Impact COVID (2020) et restructurations AP-HP (2022)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="annee" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {data.services.slice(0, 4).map((service) => (
                      <Line
                        key={service.id}
                        type="monotone"
                        dataKey={service.nom}
                        stroke={service.couleur}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-semibold text-red-800">COVID 2020</p>
                  <p className="text-xs text-red-600 mt-1">
                    +14% lits réanimation • Déprogrammation médecine/chirurgie
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm font-semibold text-orange-800">Restructurations 2022</p>
                  <p className="text-xs text-orange-600 mt-1">
                    -27% lits médecine • Virage ambulatoire (+16% places)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupation">
          <Card>
            <CardHeader>
              <CardTitle>Taux d&apos;occupation par service (2023)</CardTitle>
              <CardDescription>
                Seuil tension: 85% • Seuil critique: 95%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.services.map((s) => ({
                      service: s.nom,
                      taux: s.taux_occupation,
                      fill: s.taux_occupation >= 95 ? '#ef4444' : s.taux_occupation >= 85 ? '#f97316' : '#22c55e',
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 120]} />
                    <YAxis type="category" dataKey="service" width={120} />
                    <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}%` : value} />
                    <Bar dataKey="taux" radius={[0, 4, 4, 0]}>
                      {data.services.map((service, index) => (
                        <Bar
                          key={index}
                          dataKey="taux"
                          fill={
                            service.taux_occupation >= 95
                              ? '#ef4444'
                              : service.taux_occupation >= 85
                              ? '#f97316'
                              : '#22c55e'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex gap-4 justify-center mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-sm">Normal (&lt;85%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded" />
                  <span className="text-sm">Tension (85-95%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span className="text-sm">Critique (&gt;95%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personnel">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personnel Médical */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Personnel Médical
                </CardTitle>
                <CardDescription>
                  {Math.round(data.personnel.etp_medicaux)} ETP total (2023)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Médecins', value: data.personnel.medecins, color: '#3b82f6' },
                    { label: 'Chirurgiens', value: data.personnel.chirurgiens, color: '#8b5cf6' },
                    { label: 'Anesthésistes', value: data.personnel.anesthesistes, color: '#ec4899' },
                    { label: 'Gynéco-obstétriciens', value: data.personnel.gyneco_obstetriciens, color: '#f97316' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="font-semibold">{Math.round(item.value)} ETP</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Médecins', value: data.personnel.medecins, fill: '#3b82f6' },
                        { name: 'Chirurgiens', value: data.personnel.chirurgiens, fill: '#8b5cf6' },
                        { name: 'Anesthésistes', value: data.personnel.anesthesistes, fill: '#ec4899' },
                        { name: 'Gynéco', value: data.personnel.gyneco_obstetriciens, fill: '#f97316' },
                      ]}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Personnel Paramédical & Technique */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Personnel Paramédical & Technique
                </CardTitle>
                <CardDescription>
                  {Math.round(data.personnel.etp_non_medicaux).toLocaleString()} ETP total (2023)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Soignants (IDE, AS...)', value: data.personnel.soins, color: '#22c55e' },
                    { label: 'Techniques & Ouvriers', value: data.personnel.techniques_ouvriers, color: '#f97316' },
                    { label: 'Administratifs', value: data.personnel.administratifs, color: '#6366f1' },
                    { label: 'Médico-techniques', value: data.personnel.medico_techniques, color: '#ec4899' },
                    { label: 'Éducatifs & Sociaux', value: data.personnel.educatifs_sociaux, color: '#14b8a6' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="font-semibold">{Math.round(item.value).toLocaleString()} ETP</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Soins', value: data.personnel.soins, fill: '#22c55e' },
                        { name: 'Tech/Ouvriers', value: data.personnel.techniques_ouvriers, fill: '#f97316' },
                        { name: 'Admin', value: data.personnel.administratifs, fill: '#6366f1' },
                        { name: 'Médico-tech', value: data.personnel.medico_techniques, fill: '#ec4899' },
                        { name: 'Éduc/Social', value: data.personnel.educatifs_sociaux, fill: '#14b8a6' },
                      ]}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Évolution Personnel */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Évolution des effectifs (2020-2023)</CardTitle>
                <CardDescription>
                  Source: SAE / Hospi-Diag ATIH - Données officielles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.annees.map((annee, idx) => ({
                        annee: annee.toString(),
                        'Soignants': data.personnel.evolution_soins?.[idx] || 0,
                        'Médical': data.personnel.evolution_medicaux?.[idx] || 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="annee" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="Soignants" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="Médical" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-semibold text-red-800">Soignants 2020→2023</p>
                    <p className="text-lg font-bold text-red-600">
                      {data.personnel.evolution_soins ? 
                        `${(((data.personnel.evolution_soins[3] - data.personnel.evolution_soins[0]) / data.personnel.evolution_soins[0]) * 100).toFixed(1)}%` 
                        : '-4%'}
                    </p>
                    <p className="text-xs text-red-600">Réduction des effectifs soignants</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">Médical 2020→2023</p>
                    <p className="text-lg font-bold text-green-600">
                      {data.personnel.evolution_medicaux ? 
                        `${(((data.personnel.evolution_medicaux[3] - data.personnel.evolution_medicaux[0]) / data.personnel.evolution_medicaux[0]) * 100).toFixed(1)}%` 
                        : '+4.7%'}
                    </p>
                    <p className="text-xs text-green-600">Augmentation du personnel médical</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
