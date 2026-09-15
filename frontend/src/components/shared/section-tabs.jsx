import { NavLink } from 'react-router';

import {
  SECTION_TAB_ACTIVE_CLASS_NAME,
  SECTION_TAB_INACTIVE_CLASS_NAME,
  SECTION_TAB_LIST_CLASS_NAME,
  SECTION_TAB_NAV_CLASS_NAME,
  SECTION_TAB_TRIGGER_BASE_CLASS_NAME,
} from '@/components/ui/section-tab-styles';

/**
 * Navigation secondaire réutilisable pour les espaces fonctionnels composés
 * de plusieurs vues partageables par URL.
 */
function SectionTabs({ ariaLabel, items }) {
  return (
    <nav
      aria-label={ariaLabel}
      className={SECTION_TAB_NAV_CLASS_NAME}
    >
      <div className={SECTION_TAB_LIST_CLASS_NAME}>
        {items.map(({ label, to }) => (
          <NavLink
            className={({ isActive }) => (
              `${SECTION_TAB_TRIGGER_BASE_CLASS_NAME} ${
                isActive
                  ? SECTION_TAB_ACTIVE_CLASS_NAME
                  : SECTION_TAB_INACTIVE_CLASS_NAME
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
