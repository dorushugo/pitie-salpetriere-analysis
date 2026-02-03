'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/pilotage', label: 'Pilotage' },
  { href: '/recommandations', label: 'Recommandations' },
  { href: '/simulations', label: 'Simulations' },
  { href: '/predictions', label: 'Prédictions' },
  { href: '/export', label: 'Export' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={pathname === item.href ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              pathname === item.href && 'bg-primary text-primary-foreground'
            )}
          >
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}
