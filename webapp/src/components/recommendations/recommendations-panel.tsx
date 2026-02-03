'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  BedDouble,
  Package,
  ClipboardList,
  TrendingUp,
  Euro,
  ArrowRight,
  Loader2,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SmartRecommandation, RecommandationCategory, RecommandationPriority } from '@/lib/recommendations';

type RecommendationsPanelProps = {
  initialRecommendations?: SmartRecommandation[];
  showFilters?: boolean;
  maxItems?: number;
  compact?: boolean;
};

const priorityConfig: Record<RecommandationPriority, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  icon: string;
}> = {
  critique: {
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Critique',
    icon: '🔴',
  },
  haute: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Haute',
    icon: '🟠',
  },
  moyenne: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Moyenne',
    icon: '🟡',
  },
  basse: {
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Basse',
    icon: '🟢',
  },
};

const categoryConfig: Record<RecommandationCategory, {
  icon: typeof Users;
  label: string;
  color: string;
}> = {
  rh: { icon: Users, label: 'Ressources Humaines', color: 'text-blue-600' },
  capacite: { icon: BedDouble, label: 'Capacité', color: 'text-purple-600' },
  logistique: { icon: Package, label: 'Logistique', color: 'text-amber-600' },
  organisation: { icon: ClipboardList, label: 'Organisation', color: 'text-teal-600' },
};

export function RecommendationsPanel({
  initialRecommendations,
  showFilters = true,
  maxItems,
  compact = false,
}: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<SmartRecommandation[]>(
    initialRecommendations || []
  );
  const [loading, setLoading] = useState(!initialRecommendations);
  const [activeCategory, setActiveCategory] = useState<RecommandationCategory | 'all'>('all');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!initialRecommendations) {
      fetchRecommendations();
    }
  }, [initialRecommendations]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recommendations');
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Erreur chargement recommandations:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsComplete = (id: string) => {
    setCompletedIds([...completedIds, id]);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Filtrer les recommandations
  let filteredRecs = recommendations.filter(r => !completedIds.includes(r.id));
  if (activeCategory !== 'all') {
    filteredRecs = filteredRecs.filter(r => r.categorie === activeCategory);
  }
  if (maxItems) {
    filteredRecs = filteredRecs.slice(0, maxItems);
  }

  // Statistiques
  const stats = {
    total: recommendations.length - completedIds.length,
    critique: recommendations.filter(r => r.priorite === 'critique' && !completedIds.includes(r.id)).length,
    haute: recommendations.filter(r => r.priorite === 'haute' && !completedIds.includes(r.id)).length,
    completed: completedIds.length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recommandations Intelligentes
            </CardTitle>
            <CardDescription>
              {stats.total} action(s) à traiter
              {stats.critique > 0 && (
                <span className="text-red-600 ml-2">
                  • {stats.critique} critique(s)
                </span>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRecommendations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtres par catégorie */}
        {showFilters && (
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="text-xs">
                Toutes ({stats.total})
              </TabsTrigger>
              {Object.entries(categoryConfig).map(([key, config]) => {
                const count = recommendations.filter(r => r.categorie === key && !completedIds.includes(r.id)).length;
                const Icon = config.icon;
                return (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    <Icon className="h-3 w-3 mr-1" />
                    {count}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        )}

        {/* Liste des recommandations */}
        <div className="space-y-3">
          {filteredRecs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="font-medium">Aucune action urgente</p>
              <p className="text-sm text-muted-foreground">
                Toutes les recommandations ont été traitées
              </p>
            </div>
          ) : (
            filteredRecs.map((rec) => {
              const priority = priorityConfig[rec.priorite];
              const category = categoryConfig[rec.categorie];
              const CategoryIcon = category.icon;
              const isExpanded = expandedIds.includes(rec.id);

              return (
                <div
                  key={rec.id}
                  className={`rounded-lg border-2 p-4 ${priority.bgColor} ${priority.borderColor} transition-all`}
                >
                  {/* En-tête */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-lg">{priority.icon}</span>
                        <Badge variant="outline" className={category.color}>
                          <CategoryIcon className="h-3 w-3 mr-1" />
                          {category.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {rec.echeance === 'immediat' ? '⚡ Immédiat' :
                           rec.echeance === 'aujourd_hui' ? 'Aujourd\'hui' :
                           rec.echeance === 'cette_semaine' ? 'Cette semaine' : 'Ce mois'}
                        </Badge>
                      </div>

                      <h4 className={`font-semibold ${priority.color}`}>
                        {rec.titre}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {rec.description}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(rec.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Action concrète - toujours visible */}
                  <div className="mt-3 p-3 bg-white/60 rounded-lg">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      {rec.action_concrete}
                    </p>
                  </div>

                  {/* Détails expandables */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      {/* Impact estimé */}
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Impact:</span>
                        {rec.impact_estime}
                      </div>

                      {/* Quantification */}
                      {rec.quantification && (rec.quantification.nombre || rec.quantification.cout_estime) && (
                        <div className="grid grid-cols-2 gap-3">
                          {rec.quantification.nombre && (
                            <div className="bg-white/60 rounded p-2">
                              <div className="text-lg font-bold">
                                {rec.quantification.nombre}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {rec.quantification.unite}
                              </div>
                            </div>
                          )}
                          {rec.quantification.cout_estime && (
                            <div className="bg-white/60 rounded p-2">
                              <div className="text-lg font-bold flex items-center gap-1">
                                <Euro className="h-4 w-4" />
                                {rec.quantification.cout_estime.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Coût estimé
                              </div>
                            </div>
                          )}
                          {rec.quantification.economie_potentielle && (
                            <div className="bg-green-100 rounded p-2">
                              <div className="text-lg font-bold text-green-700 flex items-center gap-1">
                                +{rec.quantification.economie_potentielle.toLocaleString()}€
                              </div>
                              <div className="text-xs text-green-600">
                                Économie potentielle
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Déclencheur */}
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Déclencheur:</span> {rec.declencheur}
                      </div>

                      {/* Services concernés */}
                      <div className="flex flex-wrap gap-1">
                        {rec.services_concernes.map(service => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/50">
                    <Button size="sm" className="flex-1">
                      Appliquer
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsComplete(rec.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Fait
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Résumé des actions complétées */}
        {completedIds.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {completedIds.length} action(s) complétée(s) aujourd'hui
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
