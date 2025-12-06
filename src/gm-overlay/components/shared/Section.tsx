import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SectionProps {
  id?: string;
  title: string;
  icon?: LucideIcon;
  variant?: 'default' | 'secret';
  action?: ReactNode;
  children: ReactNode;
}

export function Section({
  id,
  title,
  icon: Icon,
  variant = 'default',
  action,
  children,
}: SectionProps) {
  return (
    <section
      id={id ? `section-${id}` : undefined}
      className={cn(
        'space-y-2',
        variant === 'secret' && 'border-l-2 border-red-600 pl-3'
      )}
    >
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            'text-sm font-semibold uppercase tracking-wide flex items-center gap-2',
            variant === 'default' && 'text-amber-500',
            variant === 'secret' && 'text-red-400'
          )}
        >
          {Icon && <Icon size={14} />}
          {title}
        </h3>
        {action}
      </div>
      <div className="text-neutral-300">{children}</div>
    </section>
  );
}
