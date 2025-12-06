import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface GMOverlayShellProps {
  isVisible: boolean;
  children: ReactNode;
}

export function GMOverlayShell({ isVisible, children }: GMOverlayShellProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'bg-neutral-900 text-neutral-100',
        'flex flex-col',
        'font-sans'
      )}
    >
      {children}
    </div>
  );
}
