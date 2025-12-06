import { Fragment } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BreadcrumbItem {
  label: string;
  onClick: () => void;
}

interface BreadcrumbsProps {
  trail: BreadcrumbItem[];
  hubLabel?: string;
  onHub?: () => void;
}

export function Breadcrumbs({ trail, hubLabel, onHub }: BreadcrumbsProps) {
  // Collapse long trails
  const displayTrail = trail.length > 4
    ? [
        trail[0],
        { label: '...', onClick: () => {} },
        ...trail.slice(-2)
      ]
    : trail;

  return (
    <nav
      className={cn(
        'h-8 px-4 flex items-center gap-2',
        'bg-neutral-850 text-sm border-b border-neutral-800'
      )}
    >
      {displayTrail.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <ChevronRight size={14} className="text-neutral-500 flex-shrink-0" />
          )}
          <button
            onClick={crumb.onClick}
            disabled={crumb.label === '...'}
            className={cn(
              'hover:text-cyan-400 transition-colors truncate',
              crumb.label === '...' && 'cursor-default text-neutral-500'
            )}
          >
            {crumb.label}
          </button>
        </Fragment>
      ))}

      <div className="flex-1" />

      {hubLabel && onHub && (
        <button
          onClick={onHub}
          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Home size={14} />
          <span>{hubLabel}</span>
        </button>
      )}
    </nav>
  );
}
