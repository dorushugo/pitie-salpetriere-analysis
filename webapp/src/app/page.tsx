import { Suspense } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { 
  Activity, 
  Users, 
  BedDouble, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
  Brain,
  ArrowRight,
  Lightbulb,
  Gauge,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KPICard } from '@/components/dashboard/kpi-card';
import { AlertList } from '@/components/dashboard/alert-list';
import { AdmissionsChart } from '@/components/charts/admissions-chart';
import { OccupationHeatmap } from '@/components/charts/occupation-heatmap';
import { ServicesBarChart } from '@/components/charts/services-bar-chart';
import { PredictionsChart } from '@/components/charts/predictions-chart';
import { 
  getDashboardKPIs, 
  getFilteredStats, 
  getEnsemblePredictions 
} from '@/lib/data';

async function DashboardContent() {
  const [kpis, stats, predictions] = await Promise.all([
    getDashboardKPIs(),
    getFilteredStats(),
    getEnsemblePredictions(),
  ]);

  return (
    <div className="space-y-6">
      {/* Message de bienvenue */}
      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Bienvenue sur Data Pitié</h2>
              <p className="text-blue-100">
                Votre tableau de bord de gestion hospitalière intelligent
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/pilotage">
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                  <Gauge className="h-4 w-4 mr-2" />
                  Centre de pilotage
                </Button>
              </Link>
              <Link href="/recommandations">
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Recommandations
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Admissions Aujourd'hui"
          value={kpis.admissions_aujourdhui}
          icon={<Activity className="h-4 w-4" />}
          trend={kpis.tendance === 'hausse' ? 'up' : kpis.tendance === 'baisse' ? 'down' : 'stable'}
          trendValue={`${kpis.variation_pourcentage > 0 ? '+' : ''}${kpis.variation_pourcentage}%`}
          subtitle="vs semaine précédente"
        />
        <KPICard
          title="Admissions Semaine"
          value={kpis.admissions_semaine.toLocaleString('fr-FR')}
          icon={<Calendar className="h-4 w-4" />}
          subtitle="7 derniers jours"
        />
        <KPICard
          title="Taux d'Occupation"
          value={`${kpis.taux_occupation_moyen}%`}
          icon={<BedDouble className="h-4 w-4" />}
          variant={kpis.taux_occupation_moyen > 90 ? 'danger' : kpis.taux_occupation_moyen > 80 ? 'warning' : 'default'}
        />
        <KPICard
          title="Personnel Disponible"
          value={kpis.personnel_disponible}
          icon={<Users className="h-4 w-4" />}
          subtitle="tous services"
        />
      </div>

      {/* Alertes */}
      {kpis.alertes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Alertes Actives ({kpis.alertes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList alerts={kpis.alertes} />
          </CardContent>
        </Card>
      )}

      {/* Graphiques */}
      <Tabs defaultValue="admissions" className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="occupation">Occupation</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="predictions">Prédictions</TabsTrigger>
        </TabsList>

        <TabsContent value="admissions">
          <AdmissionsChart 
            data={stats.daily.slice(-30)} 
            title="Évolution des Admissions (30 derniers jours)"
            showArea
          />
        </TabsContent>

        <TabsContent value="occupation">
          <OccupationHeatmap 
            data={stats.resources} 
            title="Taux d'Occupation par Service (7 derniers jours)"
          />
        </TabsContent>

        <TabsContent value="services">
          <ServicesBarChart 
            data={stats.services} 
            title="Admissions par Service (7 derniers jours)"
          />
        </TabsContent>

        <TabsContent value="predictions">
          <PredictionsChart
            predictions={predictions.predictions}
            title="Prédictions des Admissions (30 jours)"
            metrics={predictions.metrics.random_forest}
            showConfidence
          />
        </TabsContent>
      </Tabs>

      {/* Actions rapides */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accès rapides</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/pilotage" className="block group">
            <Card className="h-full hover:border-blue-300 hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Gauge className="h-5 w-5 text-blue-600" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="font-semibold mt-3 group-hover:text-blue-600 transition-colors">Centre de Pilotage</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Vue décisionnelle et indicateurs de tension
                </p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/recommandations" className="block group">
            <Card className="h-full hover:border-yellow-300 hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-yellow-500 transition-colors" />
                </div>
                <h3 className="font-semibold mt-3 group-hover:text-yellow-600 transition-colors">Recommandations</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Actions suggérées par l'IA
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/simulations" className="block group">
            <Card className="h-full hover:border-purple-300 hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                </div>
                <h3 className="font-semibold mt-3 group-hover:text-purple-600 transition-colors">Simulations</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Tester des scénarios de crise
                </p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/predictions" className="block group">
            <Card className="h-full hover:border-green-300 hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <Brain className="h-5 w-5 text-green-600" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                </div>
                <h3 className="font-semibold mt-3 group-hover:text-green-600 transition-colors">Prédictions IA</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Prévisions à 7 et 30 jours
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PageWrapper
      title="Dashboard"
      description="Vue d'ensemble de l'activité hospitalière"
      actions={
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          Données en temps réel
        </Badge>
      }
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </PageWrapper>
  );
}
