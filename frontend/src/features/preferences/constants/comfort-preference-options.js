import {
  ACTIVE_APPEARANCE_PALETTES,
} from '@/app/application-appearance';
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
  { value: APPEARANCE_FONT_FAMILY.SYSTEM, label: 'Police du système' },
]);

const PALETTE_OPTIONS = Object.freeze(
  ACTIVE_APPEARANCE_PALETTES.map((palette) => Object.freeze({
    value: palette.id,
    label: palette.label,
  })),
);

export {
  FONT_FAMILY_OPTIONS,
  PALETTE_OPTIONS,
  THEME_OPTIONS,
};
