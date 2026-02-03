import { Suspense } from 'react';
import { Brain, TrendingUp, Calendar, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImprovedPredictionsChart } from '@/components/charts/improved-predictions-chart';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { 
  getEnsemblePredictions, 
  getARIMAPredictions, 
  getRFPredictions,
  getSeasonalityAnalysis,
  getDailyStats,
} from '@/lib/data';
import { generatePredictionRecommandations } from '@/lib/calculations';

async function PredictionsContent() {
  const [ensemble, arima, rf, seasonality, dailyStats] = await Promise.all([
    getEnsemblePredictions(),
    getARIMAPredictions(),
    getRFPredictions(),
    getSeasonalityAnalysis(),
    getDailyStats(),
  ]);

  const avgAdmissions = dailyStats.reduce((sum, d) => sum + d.admissions, 0) / dailyStats.length;
  
  const recommandations = generatePredictionRecommandations(
    ensemble.predictions.map(p => ({
      date: p.date,
      predicted_admissions: p.ensemble_prediction,
    })),
    avgAdmissions
  );

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  return (
    <div className="space-y-6">
      {/* Nouveau composant amélioré avec backtest */}
      <ImprovedPredictionsChart
        predictions={ensemble.predictions}
        arimaMetrics={arima.metrics}
        rfMetrics={rf.metrics}
        weights={ensemble.weights}
      />

      {/* Saisonnalité */}
      <Tabs defaultValue="seasonality" className="space-y-4">
        <TabsList>
          <TabsTrigger value="seasonality">Saisonnalité</TabsTrigger>
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          <TabsTrigger value="details">Détail des Prédictions</TabsTrigger>
        </TabsList>

        <TabsContent value="seasonality">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Facteurs Saisonniers Mensuels</CardTitle>
                <CardDescription>
                  Impact relatif de chaque mois sur les admissions (données DREES)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(seasonality.monthly_factors).map(([month, factor]) => (
                    <div key={month} className="flex items-center gap-2">
                      <span className="w-10 text-sm">{monthNames[parseInt(month) - 1]}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full ${factor > 1 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(factor * 50, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-sm text-right">
                        {factor > 1 ? '+' : ''}{((factor - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facteurs Hebdomadaires</CardTitle>
                <CardDescription>
                  Impact relatif de chaque jour de la semaine (données DREES)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(seasonality.weekly_factors).map(([day, factor]) => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-20 text-sm">{dayNames[parseInt(day)]}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full ${factor > 1 ? 'bg-orange-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(factor * 50, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-sm text-right">
                        {factor > 1 ? '+' : ''}{((factor - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          {recommandations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recommandations Automatiques
                </CardTitle>
                <CardDescription>
                  Actions suggérées basées sur les prédictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommandations.map((rec, index) => (
                    <Alert key={index} variant={rec.priorite === 'haute' ? 'default' : 'default'}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        <Badge variant="outline">{rec.type.toUpperCase()}</Badge>
                        <Badge variant={rec.priorite === 'haute' ? 'destructive' : 'secondary'}>
                          {rec.priorite}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>{rec.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Aucune alerte particulière</p>
                <p className="text-muted-foreground">Les prédictions n&apos;indiquent pas de situation exceptionnelle à venir.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Détail des Prédictions (14 jours)</CardTitle>
              <CardDescription>
                Prédictions jour par jour avec intervalles de confiance à 95%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Date</th>
                      <th className="text-center p-3">Fiabilité</th>
                      <th className="text-right p-3">ARIMA</th>
                      <th className="text-right p-3">Random Forest</th>
                      <th className="text-right p-3 font-bold">Ensemble</th>
                      <th className="text-right p-3">IC 95%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ensemble.predictions.slice(0, 14).map((pred, index) => {
                      const reliability = index < 7 ? 'Haute' : index < 14 ? 'Moyenne' : 'Faible';
                      const reliabilityColor = index < 7 ? 'bg-green-100 text-green-700' : index < 14 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                      
                      return (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <span className="font-medium">
                              {new Date(pred.date).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">J+{index + 1}</span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={reliabilityColor}>
                              {reliability}
                            </Badge>
                          </td>
                          <td className="text-right p-3 text-orange-600">
                            {pred.arima_prediction}
                          </td>
                          <td className="text-right p-3 text-green-600">
                            {pred.rf_prediction}
                          </td>
                          <td className="text-right p-3 font-bold text-blue-600">
                            {pred.ensemble_prediction}
                          </td>
                          <td className="text-right p-3 text-muted-foreground">
                            [{pred.lower_bound} - {pred.upper_bound}]
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PredictionsPage() {
  return (
    <PageWrapper
      title="Prédictions"
      description="Analyse prédictive des admissions hospitalières"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <PredictionsContent />
      </Suspense>
    </PageWrapper>
  );
}
