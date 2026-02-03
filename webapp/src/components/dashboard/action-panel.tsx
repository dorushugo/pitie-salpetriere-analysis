'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Users,
  BedDouble,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Phone,
  FileText,
  Stethoscope,
} from 'lucide-react';

type ActionPriority = 'critical' | 'high' | 'medium' | 'low';
type ActionCategory = 'rh' | 'capacite' | 'logistique' | 'organisation';

type Action = {
  id: string;
  titre: string;
  description: string;
  priorite: ActionPriority;
  categorie: ActionCategory;
  impact: string;
  echeance: string;
  actionLabel: string;
  details?: string[];
};

const priorityConfig = {
  critical: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Critique',
  },
  high: {
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Haute',
  },
  medium: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Moyenne',
  },
  low: {
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Basse',
  },
};

const categoryConfig = {
  rh: { icon: Users, label: 'Ressources Humaines' },
  capacite: { icon: BedDouble, label: 'Capacité' },
  logistique: { icon: Stethoscope, label: 'Logistique' },
  organisation: { icon: Calendar, label: 'Organisation' },
};

type ActionPanelProps = {
  predictions?: {
    variation_prevue: number;
    pic_attendu: string;
    jours_tension: number;
  };
  tauxOccupation: number;
  personnelDisponible: number;
};

export function ActionPanel({ 
  predictions = { variation_prevue: 15, pic_attendu: '2026-02-15', jours_tension: 5 },
  tauxOccupation = 70,
  personnelDisponible = 280,
}: ActionPanelProps) {
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  // Générer des actions basées sur les données
  const generateActions = (): Action[] => {
    const actions: Action[] = [];

    // Actions basées sur le taux d'occupation
    if (tauxOccupation > 85) {
      actions.push({
        id: 'cap-1',
        titre: 'Activer les lits supplémentaires',
        description: `Taux d'occupation à ${tauxOccupation}%. Préparer l'ouverture de lits de réserve.`,
        priorite: tauxOccupation > 90 ? 'critical' : 'high',
        categorie: 'capacite',
        impact: '+15 à 20 lits disponibles',
        echeance: 'Immédiat',
        actionLabel: 'Contacter le bed manager',
        details: [
          'Identifier les lits de SSR convertibles',
          'Vérifier la disponibilité du matériel',
          'Alerter les équipes concernées',
        ],
      });
    }

    // Actions basées sur les prédictions
    if (predictions.variation_prevue > 10) {
      actions.push({
        id: 'rh-1',
        titre: `Anticiper le pic d'activité du ${new Date(predictions.pic_attendu).toLocaleDateString('fr-FR')}`,
        description: `Hausse prévue de ${predictions.variation_prevue}% des admissions. Renforcer les équipes.`,
        priorite: predictions.variation_prevue > 20 ? 'critical' : 'high',
        categorie: 'rh',
        impact: `Besoin de ${Math.ceil(predictions.variation_prevue * 2)} soignants supplémentaires`,
        echeance: `Avant le ${new Date(predictions.pic_attendu).toLocaleDateString('fr-FR')}`,
        actionLabel: 'Planifier les rappels',
        details: [
          'Consulter le pool de remplacement',
          'Contacter les intérimaires habituels',
          'Proposer des heures supplémentaires',
          'Décaler les congés non critiques',
        ],
      });
    }

    // Action de recrutement si manque structurel
    if (personnelDisponible < 300) {
      actions.push({
        id: 'rh-2',
        titre: 'Lancer une campagne de recrutement IDE',
        description: 'Effectif sous le seuil optimal. Anticiper les besoins à moyen terme.',
        priorite: 'medium',
        categorie: 'rh',
        impact: 'Réduire le recours à l\'intérim de 20%',
        echeance: 'Sous 2 semaines',
        actionLabel: 'Créer les offres',
        details: [
          'Publier sur les jobboards spécialisés (Hublo, FHF)',
          'Contacter les IFSI locaux',
          'Activer le réseau des anciens',
          'Préparer les entretiens groupés',
        ],
      });
    }

    // Actions de prévention hivernale (basé sur la saisonnalité)
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 9 || currentMonth <= 1) { // Oct-Fév
      actions.push({
        id: 'org-1',
        titre: 'Activer le protocole hivernal',
        description: 'Période à risque épidémique. Préparer les capacités grippe/bronchiolite.',
        priorite: 'high',
        categorie: 'organisation',
        impact: 'Réduire le temps de réponse aux pics de 30%',
        echeance: 'Cette semaine',
        actionLabel: 'Voir le protocole',
        details: [
          'Vérifier les stocks de vaccins',
          'Former les équipes au protocole grippe',
          'Préparer les zones de cohorting',
          'Coordonner avec les urgences pédiatriques',
        ],
      });
    }

    // Action logistique standard
    actions.push({
      id: 'log-1',
      titre: 'Vérifier les stocks critiques',
      description: 'Contrôle hebdomadaire des consommables et médicaments essentiels.',
      priorite: 'low',
      categorie: 'logistique',
      impact: 'Éviter les ruptures de stock',
      echeance: 'Hebdomadaire',
      actionLabel: 'Accéder à l\'inventaire',
      details: [
        'Vérifier les respirateurs disponibles',
        'Contrôler les stocks de sédatifs',
        'Valider les commandes en cours',
      ],
    });

    return actions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priorite] - priorityOrder[b.priorite];
    });
  };

  const actions = generateActions();
  const activeActions = actions.filter(a => !completedActions.includes(a.id));

  const markAsComplete = (id: string) => {
    setCompletedActions([...completedActions, id]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Actions Recommandées
            </CardTitle>
            <CardDescription>
              {activeActions.length} action(s) à traiter • Basées sur les prédictions et l'état actuel
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            Mise à jour il y a 5 min
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-lg font-medium">Aucune action urgente</p>
            <p className="text-sm text-muted-foreground">
              Toutes les recommandations ont été traitées
            </p>
          </div>
        ) : (
          activeActions.map((action) => {
            const priority = priorityConfig[action.priorite];
            const category = categoryConfig[action.categorie];
            const CategoryIcon = category.icon;

            return (
              <div
                key={action.id}
                className={`rounded-lg border-2 p-4 ${priority.bgColor} ${priority.borderColor}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${priority.color}`} />
                      <Badge variant="secondary" className="text-xs">
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {category.label}
                      </Badge>
                      <Badge className={`${priority.textColor} bg-transparent border ${priority.borderColor}`}>
                        Priorité {priority.label}
                      </Badge>
                    </div>
                    
                    <h4 className="font-semibold text-lg mb-1">{action.titre}</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {action.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm mb-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Impact:</span> {action.impact}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Échéance:</span> {action.echeance}
                      </div>
                    </div>

                    {action.details && (
                      <div className="bg-white/50 rounded p-3 mb-3">
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          ÉTAPES RECOMMANDÉES:
                        </p>
                        <ul className="text-sm space-y-1">
                          {action.details.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <ArrowRight className="h-3 w-3 mt-1 text-muted-foreground" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="flex-1">
                    {action.actionLabel}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsComplete(action.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Fait
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {completedActions.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-500" />
              {completedActions.length} action(s) complétée(s) aujourd'hui
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
