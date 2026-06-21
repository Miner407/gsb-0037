import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: number | string;
  icon: LucideIcon;
  accent?: 'primary' | 'accent' | 'red' | 'green';
  subtitle?: string;
}

export default function StatsCard({ title, value, icon: Icon, accent = 'primary', subtitle }: Props) {
  const accentColors = {
    primary: 'bg-primary-100 text-primary-600',
    accent: 'bg-accent-100 text-accent-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
  };

  const borderColors = {
    primary: 'after:bg-primary-500',
    accent: 'after:bg-accent-500',
    red: 'after:bg-red-500',
    green: 'after:bg-green-500',
  };

  return (
    <div className={`card p-5 relative overflow-hidden after:absolute after:bottom-0 after:left-0 after:h-1 after:w-16 after:rounded-tr-full ${borderColors[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="font-serif text-3xl font-bold text-slate-800">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accentColors[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
