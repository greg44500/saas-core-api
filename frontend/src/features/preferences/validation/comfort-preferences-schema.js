import { z } from 'zod';

import {
  APPEARANCE_ACCESSIBILITY_MODE,
  APPEARANCE_FONT_FAMILY,
  APPEARANCE_PALETTE,
  APPEARANCE_THEME,
} from '@/lib/appearance-preferences';

const comfortPreferencesSchema = z.strictObject({
  theme: z.enum(Object.values(APPEARANCE_THEME)),
  fontFamily: z.enum(Object.values(APPEARANCE_FONT_FAMILY)),
  paletteId: z.enum(Object.values(APPEARANCE_PALETTE)),
  accessibilityMode: z.enum(Object.values(APPEARANCE_ACCESSIBILITY_MODE)),
});

export { comfortPreferencesSchema };
