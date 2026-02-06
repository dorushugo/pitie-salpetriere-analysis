'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Gauge,
  Lightbulb,
  FlaskConical,
  TrendingUp,
  Download,
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  Bed,
  Database,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const mainNavItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Vue d\'ensemble',
  },
  {
    href: '/services',
    label: 'Services',
    icon: Bed,
    description: 'Lits & capacités',
  },
  {
    href: '/pilotage',
    label: 'Pilotage',
    icon: Gauge,
    description: 'Centre de décision',
  },
  {
    href: '/recommandations',
    label: 'Recommandations',
    icon: Lightbulb,
    description: 'Actions suggérées',
  },
  {
    href: '/simulations',
    label: 'Simulations',
    icon: FlaskConical,
    description: 'Scénarios de crise',
  },
  {
    href: '/predictions',
    label: 'Prédictions',
    icon: TrendingUp,
    description: 'Prévisions IA',
  },
  {
    href: '/predictions/resources',
    label: 'Besoins Ressources',
    icon: Package,
    description: 'Lits, personnel, équipements',
  },
  {
    href: '/export',
    label: 'Export',
    icon: Download,
    description: 'Rapports & données',
  },
  {
    href: '/donnees',
    label: 'Données',
    icon: Database,
    description: 'Explorer les datasets',
  },
];

const bottomNavItems = [
  {
    href: '#',
    label: 'Aide',
    icon: HelpCircle,
  },
  {
    href: '#',
    label: 'Paramètres',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo / Header */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-gray-100',
          collapsed && 'justify-center px-2'
        )}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 truncate">Data Pitié</h1>
              <p className="text-xs text-gray-500 truncate">Gestion hospitalière</p>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    )}
                  />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        'block text-sm font-medium truncate',
                        isActive && 'text-blue-700'
                      )}>
                        {item.label}
                      </span>
                      <span className="block text-xs text-gray-400 truncate">
                        {item.description}
                      </span>
                    </div>
                  )}
                  {isActive && !collapsed && (
                    <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Status Card */}
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">Système actif</span>
              </div>
              <p className="text-xs text-green-600">
                Données mises à jour il y a 5 min
              </p>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="px-3 py-3 border-t border-gray-100">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className="h-5 w-5" />
                {!collapsed && (
                  <span className="text-sm">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Collapse Toggle */}
        <div className="px-3 py-3 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full justify-center text-gray-400 hover:text-gray-600',
              !collapsed && 'justify-start'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-xs">Réduire</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-[260px] min-h-screen transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
