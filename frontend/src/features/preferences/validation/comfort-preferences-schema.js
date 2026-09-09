import { z } from 'zod';

import {
  ACTIVE_APPEARANCE_PALETTE_IDS,
} from '@/app/application-appearance';
import {
  APPEARANCE_ACCESSIBILITY_MODE,
  APPEARANCE_FONT_FAMILY,
  APPEARANCE_THEME,
} from '@/lib/appearance-preferences';

const comfortPreferencesSchema = z.strictObject({
  theme: z.enum(Object.values(APPEARANCE_THEME)),
  fontFamily: z.enum(Object.values(APPEARANCE_FONT_FAMILY)),
  paletteId: z.enum(ACTIVE_APPEARANCE_PALETTE_IDS),
  accessibilityMode: z.enum(Object.values(APPEARANCE_ACCESSIBILITY_MODE)),
});

export { comfortPreferencesSchema };
