'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { TensionIndicator } from '@/components/dashboard/tension-indicator';
import { ActionPanel } from '@/components/dashboard/action-panel';
import { StaffingForecast } from '@/components/dashboard/staffing-forecast';
import { FinancialOverview } from '@/components/dashboard/financial-overview';
import { CrisisIntelligence } from '@/components/dashboard/crisis-intelligence';
import { ExecutiveSummaryDemo } from '@/components/dashboard/executive-summary';
import { QualityIndicators } from '@/components/dashboard/quality-indicators';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LayoutDashboard, Users, Euro, Shield, BarChart3, Award } from 'lucide-react';

type DashboardData = {
  tauxOccupation: number;
  personnelDisponible: number;
  personnelRequis: number;
  servicesTension: {
    service: string;
    tauxOccupation: number;
    tendance: 'hausse' | 'stable' | 'baisse';
  }[];
  predictions: {
    variation_prevue: number;
    pic_attendu: string;
    jours_tension: number;
  };
};

export default function PilotagePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('direction');

  useEffect(() => {
    async function fetchData() {
      try {
        // Charger les données services réelles (Hospi-Diag)
        const servicesRes = await fetch('/api/services');
        const servicesData = await servicesRes.json();

        // Transformer les services réels en format attendu
        const servicesTension = servicesData.services?.map((s: any) => ({
          service: s.nom,
          tauxOccupation: Math.round(s.taux_occupation),
          tendance: s.taux_occupation >= 85 ? 'hausse' : s.taux_occupation < 65 ? 'baisse' : 'stable' as const,
        })) || [];

        // Calculer le taux d'occupation global pondéré par les lits
        const totalLits = servicesData.services?.reduce((sum: number, s: any) => sum + s.lits, 0) || 1;
        const tauxGlobal = servicesData.services?.reduce(
          (sum: number, s: any) => sum + (s.taux_occupation * s.lits), 0
        ) / totalLits || 80;

        setData({
          tauxOccupation: Math.round(tauxGlobal),
          personnelDisponible: servicesData.personnel?.etp_soins || 4716,
          personnelRequis: Math.round((servicesData.personnel?.etp_soins || 4716) * 1.1),
          servicesTension,
          predictions: {
            variation_prevue: 15,
            pic_attendu: '2026-02-10',
            jours_tension: 5,
          },
        });
      } catch (error) {
        console.error('Erreur chargement données:', error);
        // Données par défaut avec vrais services Hospi-Diag
        setData({
          tauxOccupation: 82,
          personnelDisponible: 4716,
          personnelRequis: 5188,
          servicesTension: [
            { service: 'Médecine', tauxOccupation: 67, tendance: 'stable' },
            { service: 'Chirurgie', tauxOccupation: 109, tendance: 'hausse' },
            { service: 'Réanimation', tauxOccupation: 85, tendance: 'stable' },
            { service: 'Soins Intensifs', tauxOccupation: 82, tendance: 'stable' },
            { service: 'USC', tauxOccupation: 78, tendance: 'baisse' },
            { service: 'Obstétrique', tauxOccupation: 68, tendance: 'stable' },
          ],
          predictions: {
            variation_prevue: 15,
            pic_attendu: '2026-02-10',
            jours_tension: 5,
          },
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        title="Centre de Pilotage"
        description="Vue décisionnelle pour la gestion opérationnelle et stratégique"
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Centre de Pilotage"
      description="Vue décisionnelle pour la gestion opérationnelle et stratégique"
    >
      <div className="space-y-6">

      {/* Indicateur de tension principal */}
      {data && (
        <TensionIndicator
          tauxOccupationGlobal={data.tauxOccupation}
          personnelDisponible={data.personnelDisponible}
          personnelRequis={data.personnelRequis}
          servicesTension={data.servicesTension}
          predictedPeak={{
            date: data.predictions.pic_attendu,
            variation: data.predictions.variation_prevue,
          }}
        />
      )}

      {/* Onglets pour les différentes vues */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="direction" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Direction</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Actions</span>
          </TabsTrigger>
          <TabsTrigger value="crisis" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Crises</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Qualité</span>
          </TabsTrigger>
          <TabsTrigger value="rh" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Personnel</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-2">
            <Euro className="h-4 w-4" />
            <span className="hidden sm:inline">Finances</span>
          </TabsTrigger>
        </TabsList>

        {/* Synthèse Direction - Vue pour le CODIR */}
        <TabsContent value="direction" className="space-y-6 mt-6">
          <ExecutiveSummaryDemo />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {data && (
            <ActionPanel
              predictions={data.predictions}
              tauxOccupation={data.tauxOccupation}
              personnelDisponible={data.personnelDisponible}
            />
          )}
        </TabsContent>

        <TabsContent value="crisis" className="space-y-6 mt-6">
          <CrisisIntelligence />
        </TabsContent>

        {/* Indicateurs Qualité */}
        <TabsContent value="quality" className="space-y-6 mt-6">
          <QualityIndicators />
        </TabsContent>

        <TabsContent value="rh" className="space-y-6 mt-6">
          <StaffingForecast
            personnelActuel={data?.personnelDisponible || 286}
            poolRemplacement={45}
            forecast={[]}
          />
        </TabsContent>

        <TabsContent value="finance" className="space-y-6 mt-6">
          <FinancialOverview />
        </TabsContent>
      </Tabs>
      </div>
    </PageWrapper>
  );
}
