import { cn } from '@/lib/utils';

/**
 * Déplie ou replie un contenu sans imposer sa logique métier au composant appelant.
 * Le contenu reste monté pour préserver son état pendant la transition.
 */
function SmoothCollapse({ children, className, open }) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
        open
          ? 'grid-rows-[1fr] opacity-100'
          : 'grid-rows-[0fr] opacity-0',
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export { SmoothCollapse };
