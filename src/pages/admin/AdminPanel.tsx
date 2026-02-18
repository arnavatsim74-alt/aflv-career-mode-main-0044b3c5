import { Link } from 'react-router-dom';
import { Plane, FileText, Database, Calculator, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/ui/section-card';
import { AdminGuard } from './AdminGuard';

const sections = [
  {
    title: 'Fleet Management',
    description: 'Track aircraft availability and maintenance status.',
    href: '/admin/fleet',
    icon: Plane,
  },
  {
    title: 'Registrations',
    description: 'Review and approve new pilot registrations.',
    href: '/admin/registrations',
    icon: Users,
  },
  {
    title: 'Career Dispatch',
    description: 'Assign dispatch legs to approved pilots.',
    href: '/admin/dispatch',
    icon: Plane,
  },
  {
    title: 'PIREP Review',
    description: 'Approve/reject PIREPs and apply rewards.',
    href: '/admin/pireps',
    icon: FileText,
  },
  {
    title: 'Route Import',
    description: 'Import route catalog CSV for auto-assignment.',
    href: '/admin/routes',
    icon: Database,
  },
  {
    title: 'Hour Multipliers',
    description: 'Configure flight-hour based multipliers.',
    href: '/admin/multipliers',
    icon: Calculator,
  },
];

export default function AdminPanel() {
  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">AFLV vCAREER PANEL</h1>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <Link key={section.href} to={section.href}>
                <SectionCard
                  title={section.title}
                  icon={<section.icon className="h-5 w-5 text-muted-foreground" />}
                  className="h-full transition hover:border-primary"
                >
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </SectionCard>
              </Link>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
