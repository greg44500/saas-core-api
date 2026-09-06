import { NavLink } from 'react-router';

/**
 * Navigation secondaire réutilisable pour les espaces fonctionnels composés
 * de plusieurs vues partageables par URL.
 */
function SectionTabs({ ariaLabel, items }) {
  return (
    <nav
      aria-label={ariaLabel}
      className="overflow-x-auto border-b border-border"
    >
      <div className="flex min-w-max gap-6">
        {items.map(({ label, to }) => (
          <NavLink
            className={({ isActive }) => (
              `relative -mb-px border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`
            )}
            end
            key={to}
            to={to}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export { SectionTabs };
