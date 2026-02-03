'use client';

import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';

type PageWrapperProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  fullWidth?: boolean;
};

export function PageWrapper({
  children,
  title,
  description,
  actions,
  fullWidth = false,
}: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      
      {/* Main Content */}
      <div className="ml-[260px] transition-all duration-300">
        {/* Page Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className={cn(
            'px-6 py-4',
            !fullWidth && 'max-w-7xl mx-auto'
          )}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {description && (
                  <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className={cn(
          'p-6',
          !fullWidth && 'max-w-7xl mx-auto'
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}
