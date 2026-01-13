import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 fixed left-0 top-[57px] bottom-0 border-r border-va-border">
          <Sidebar />
        </div>
        
        {/* Main content */}
        <main className="flex-1 md:ml-64 p-4 md:p-6">
          <div className="max-w-6xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}