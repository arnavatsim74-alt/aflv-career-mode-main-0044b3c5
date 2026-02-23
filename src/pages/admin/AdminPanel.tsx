import { Link } from 'react-router-dom';
import { FileText, Gauge, Plane, UserPlus, Users } from 'lucide-react';
import { AdminGuardLayout } from './AdminGuardLayout';

const adminSections = [
  {
    title: 'Fleet Tracker',
    description: 'Manage virtual fleet status and assignments.',
    href: '/admin/fleet',
    icon: Plane,
  },
  {
    title: 'PIREP Review',
    description: 'Approve or reject submitted flight reports.',
    href: '/admin/pireps',
    icon: FileText,
  },
  {
    title: 'Multipliers',
    description: 'Configure flight-hour multiplier rules.',
    href: '/admin/multipliers',
    icon: Gauge,
  },
  {
    title: 'Registrations',
    description: 'Review and process pilot applications.',
    href: '/admin/registrations',
    icon: UserPlus,
  },
  {
    title: 'Members Access',
    description: 'Switch member access between Pilot and Admin.',
    href: '/admin/members',
    icon: Users,
  },
];

export default function AdminPanel() {
  return (
    <AdminGuardLayout title="AFLV vCAREER Admin">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {adminSections.map((section) => (
          <Link key={section.href} to={section.href} className="rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <section.icon className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{section.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </Link>
        ))}
      </div>
    </AdminGuardLayout>
  );
}
