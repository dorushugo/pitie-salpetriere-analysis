'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { RecommendationsPanel } from '@/components/recommendations/recommendations-panel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  TrendingUp,
  Users,
  BedDouble,
  Package,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Euro,
  BarChart3,
  Loader2,
} from 'lucide-react';

type RecommendationStats = {
  total: number;
  parCategorie: Record<string, number>;
  parPriorite: Record<string, number>;
  economiesPotentielles: number;
};

export default function RecommandationsPage() {
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/recommendations');
      const data = await response.json();
      
      const recommendations = data.recommendations || [];
      
      // Calculer les stats
      const parCategorie: Record<string, number> = {
        rh: 0,
        capacite: 0,
        logistique: 0,
        organisation: 0,
      };
      const parPriorite: Record<string, number> = {
        critique: 0,
        haute: 0,
        moyenne: 0,
        basse: 0,
      };
      let economiesPotentielles = 0;

      recommendations.forEach((rec: any) => {
        parCategorie[rec.categorie] = (parCategorie[rec.categorie] || 0) + 1;
        parPriorite[rec.priorite] = (parPriorite[rec.priorite] || 0) + 1;
        if (rec.quantification?.economie_potentielle) {
          economiesPotentielles += rec.quantification.economie_potentielle;
        }
      });

      setStats({
        total: recommendations.length,
        parCategorie,
        parPriorite,
        economiesPotentielles,
      });
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Recommandations Intelligentes"
      description="Actions suggérées par l'IA basées sur l'analyse en temps réel"
    >
      <div className="space-y-6">

        {/* Résumé des stats */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Actions à traiter</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 text-xs">
                  {stats.parPriorite.critique > 0 && (
                    <Badge variant="destructive">
                      {stats.parPriorite.critique} critique(s)
                    </Badge>
                  )}
                  {stats.parPriorite.haute > 0 && (
                    <Badge className="bg-orange-500">
                      {stats.parPriorite.haute} haute(s)
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Ressources Humaines</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-500" />
                  {stats.parCategorie.rh || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Recrutement, planning, rappels
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Capacité & Lits</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <BedDouble className="h-6 w-6 text-purple-500" />
                  {stats.parCategorie.capacite || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Ouverture lits, transferts
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-green-700">Économies potentielles</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2 text-green-700">
                  <Euro className="h-6 w-6" />
                  {stats.economiesPotentielles.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-green-600">
                  En appliquant les recommandations
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Explication du système */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <BarChart3 className="h-5 w-5" />
              Comment fonctionne le module de recommandations ?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-800 mb-1">1. Analyse des données</div>
                <p className="text-blue-700">
                  Le système analyse en continu les admissions, le taux d'occupation, 
                  le personnel disponible et les prédictions.
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-800 mb-1">2. Détection des risques</div>
                <p className="text-blue-700">
                  Des seuils d'alerte identifient automatiquement les situations 
                  nécessitant une action (saturation, déficit personnel, pic prévu).
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-800 mb-1">3. Génération d'actions</div>
                <p className="text-blue-700">
                  Pour chaque risque détecté, le système génère des recommandations 
                  concrètes, quantifiées et priorisées.
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-800 mb-1">4. Suivi de l'impact</div>
                <p className="text-blue-700">
                  Chaque recommandation inclut une estimation de l'impact et des 
                  économies potentielles pour faciliter la prise de décision.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel de recommandations */}
        <RecommendationsPanel showFilters={true} />

        {/* Actions rapides */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/simulations">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Tester un scénario
                </CardTitle>
                <CardDescription>
                  Simulez une épidémie, une grève ou un afflux massif pour voir les recommandations adaptées
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/pilotage">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Vue pilotage
                </CardTitle>
                <CardDescription>
                  Accédez au tableau de bord décisionnel avec indicateurs de tension et planning RH
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/predictions">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  Prédictions détaillées
                </CardTitle>
                <CardDescription>
                  Consultez les prédictions à 7 et 30 jours avec les intervalles de confiance
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
