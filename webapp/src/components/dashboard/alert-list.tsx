'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Alert as AlertType } from '@/lib/types';

type AlertListProps = {
  alerts: AlertType[];
};

export function AlertList({ alerts }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune alerte active
      </div>
    );
  }

  const getAlertIcon = (niveau: AlertType['niveau']) => {
    switch (niveau) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (niveau: AlertType['niveau']) => {
    switch (niveau) {
      case 'critical':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Alert key={alert.id} variant={getAlertVariant(alert.niveau)}>
          {getAlertIcon(alert.niveau)}
          <AlertTitle className="flex items-center gap-2">
            {alert.service && <Badge variant="outline">{alert.service}</Badge>}
            {alert.type === 'saturation' && 'Saturation'}
            {alert.type === 'personnel' && 'Personnel'}
            {alert.type === 'stock' && 'Stock'}
            {alert.type === 'epidemie' && 'Épidémie'}
          </AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
