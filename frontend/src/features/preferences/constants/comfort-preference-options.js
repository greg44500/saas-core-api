import {
  APPEARANCE_FONT_FAMILY,
  APPEARANCE_THEME,
} from '@/lib/appearance-preferences';

const THEME_OPTIONS = Object.freeze([
  { value: APPEARANCE_THEME.SYSTEM, label: 'Système' },
  { value: APPEARANCE_THEME.LIGHT, label: 'Clair' },
  { value: APPEARANCE_THEME.DARK, label: 'Sombre' },
]);

const FONT_FAMILY_OPTIONS = Object.freeze([
  { value: APPEARANCE_FONT_FAMILY.INTER, label: 'Inter' },
  { value: APPEARANCE_FONT_FAMILY.GEIST, label: 'Geist' },
  { value: APPEARANCE_FONT_FAMILY.MANROPE, label: 'Manrope' },
  { value: APPEARANCE_FONT_FAMILY.SYSTEM, label: 'Police du système' },
]);

export {
  FONT_FAMILY_OPTIONS,
  THEME_OPTIONS,
};
