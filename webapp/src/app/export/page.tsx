'use client';

import { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileJson,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { DatasetsOverview } from '@/components/dashboard/datasets-overview';
import { HospitalProfile } from '@/components/dashboard/hospital-profile';

type ExportType = 'admissions' | 'services' | 'resources' | 'predictions';
type ExportFormat = 'csv' | 'json';

const EXPORT_OPTIONS: {
  type: ExportType;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'admissions',
    title: 'Statistiques Journalières',
    description: '731 jours de données agrégées (admissions, coûts, durées)',
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    type: 'services',
    title: 'Données par Service',
    description: 'Statistiques détaillées par service hospitalier',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    type: 'resources',
    title: 'Ressources',
    description: 'Taux d\'occupation, personnel, lits par service',
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    type: 'predictions',
    title: 'Prédictions',
    description: 'Prédictions des modèles ARIMA, RF et Ensemble',
    icon: <FileJson className="h-5 w-5" />,
  },
];

export default function ExportPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string[]>([]);

  const handleExport = async (type: ExportType, format: ExportFormat) => {
    const key = `${type}-${format}`;
    setLoading(key);

    try {
      const response = await fetch(`/api/export?type=${type}&format=${format}`);
      
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloaded(prev => [...prev, key]);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <PageWrapper
      title="Données & Export"
      description="Sources de données et téléchargements"
    >
      <Tabs defaultValue="hospital" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="hospital">🏥 Pitié-Salpêtrière</TabsTrigger>
          <TabsTrigger value="sources">📊 Sources</TabsTrigger>
          <TabsTrigger value="export">📥 Export</TabsTrigger>
        </TabsList>

        <TabsContent value="hospital">
          <HospitalProfile />
        </TabsContent>

        <TabsContent value="sources">
          <DatasetsOverview />
        </TabsContent>

        <TabsContent value="export">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Info */}
            <Card>
              <CardHeader>
                <CardTitle>Exporter les Données</CardTitle>
                <CardDescription>
                  Téléchargez les données du dataset et les prédictions dans le format de votre choix.
                  Les fichiers CSV peuvent être ouverts dans Excel.
                </CardDescription>
              </CardHeader>
            </Card>

          {/* Export Options */}
          <div className="grid gap-4 md:grid-cols-2">
            {EXPORT_OPTIONS.map((option) => (
              <Card key={option.type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {option.icon}
                    {option.title}
                  </CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleExport(option.type, 'csv')}
                      disabled={loading !== null}
                    >
                      {loading === `${option.type}-csv` ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : downloaded.includes(`${option.type}-csv`) ? (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleExport(option.type, 'json')}
                      disabled={loading !== null}
                    >
                      {loading === `${option.type}-json` ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : downloaded.includes(`${option.type}-json`) ? (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      JSON
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Dataset Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations sur le Dataset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Période</p>
                  <p className="font-medium">01/01/2024 - 31/12/2025</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Admissions</p>
                  <p className="font-medium">~243 000</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Services</p>
                  <p className="font-medium">6 services</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modèles</p>
                  <p className="font-medium">ARIMA + Random Forest</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Variables Disponibles</CardTitle>
              <CardDescription>
                Liste des variables présentes dans les exports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Statistiques Journalières</h4>
                  <div className="flex flex-wrap gap-2">
                    {['date', 'admissions', 'duree_moyenne', 'cout_total', 'cout_moyen', 'personnel_total', 'age_moyen', 'jour_semaine', 'mois'].map(v => (
                      <Badge key={v} variant="secondary">{v}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Données par Service</h4>
                  <div className="flex flex-wrap gap-2">
                    {['date', 'service', 'admissions', 'duree_moyenne', 'cout_total', 'cas_graves'].map(v => (
                      <Badge key={v} variant="secondary">{v}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Ressources</h4>
                  <div className="flex flex-wrap gap-2">
                    {['date', 'service', 'lits_total', 'lits_occupes', 'taux_occupation', 'personnel_total', 'personnel_disponible'].map(v => (
                      <Badge key={v} variant="secondary">{v}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Prédictions</h4>
                  <div className="flex flex-wrap gap-2">
                    {['date', 'arima', 'random_forest', 'ensemble', 'minimum', 'maximum'].map(v => (
                      <Badge key={v} variant="secondary">{v}</Badge>
                    ))}
                  </div>
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
