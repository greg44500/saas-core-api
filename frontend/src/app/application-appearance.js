const CORE_APPEARANCE_PALETTES = Object.freeze([
  Object.freeze({
    id: 'core',
    label: 'Core Atlantique',
    previewColors: Object.freeze([
      '#137C8B',
      '#709CA7',
      '#B8CBD0',
      '#7A90A4',
      '#344D59',
    ]),
  }),
]);

const APPEARANCE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const APPEARANCE_PREVIEW_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * Point de composition des palettes réellement intégrées dans le produit.
 *
 * Un module dérivé fournit `palettes: [{ id, label, previewColors }]`. Le même
 * `id` doit être déclaré côté backend et disposer de ses tokens CSS via
 * `:root[data-palette="<id>"]` et, si nécessaire, sa variante `.dark`.
 * `previewColors` reste une métadonnée frontend contrôlée destinée uniquement
 * à représenter visuellement la palette dans les préférences.
 */
const APPLICATION_APPEARANCE_MODULES = Object.freeze([]);

function isValidPreviewColors(previewColors) {
  return Array.isArray(previewColors)
    && previewColors.length >= 3
    && previewColors.length <= 6
    && previewColors.every((color) => (
      typeof color === 'string'
      && APPEARANCE_PREVIEW_COLOR_PATTERN.test(color)
    ));
}

function composeApplicationPalettes(modules = []) {
  if (!Array.isArray(modules)) {
    throw new TypeError('modules must be an array');
  }

  const palettes = CORE_APPEARANCE_PALETTES.map((palette) => ({
    ...palette,
    previewColors: [...palette.previewColors],
  }));

  modules.forEach((moduleDefinition, moduleIndex) => {
    if (
      moduleDefinition === null
      || Array.isArray(moduleDefinition)
      || typeof moduleDefinition !== 'object'
    ) {
      throw new TypeError(
        `Appearance module at index ${moduleIndex} must be an object`,
      );
    }

    const modulePalettes = moduleDefinition.palettes ?? [];
    if (!Array.isArray(modulePalettes)) {
      throw new TypeError(`modules[${moduleIndex}].palettes must be an array`);
    }

    modulePalettes.forEach((palette) => {
      if (
        palette === null
        || Array.isArray(palette)
        || typeof palette !== 'object'
        || typeof palette.id !== 'string'
        || !APPEARANCE_ID_PATTERN.test(palette.id)
        || typeof palette.label !== 'string'
        || !palette.label.trim()
        || !isValidPreviewColors(palette.previewColors)
      ) {
        throw new TypeError('Invalid appearance palette descriptor');
      }

      if (palettes.some((entry) => entry.id === palette.id)) {
        throw new TypeError(`Duplicate appearance palette id: ${palette.id}`);
      }

      palettes.push({
        id: palette.id,
        label: palette.label.trim(),
        previewColors: [...palette.previewColors],
      });
    });
  });

  return Object.freeze(
    palettes.map((palette) => Object.freeze({
      ...palette,
      previewColors: Object.freeze([...palette.previewColors]),
    })),
  );
}

const ACTIVE_APPEARANCE_PALETTES = composeApplicationPalettes(
  APPLICATION_APPEARANCE_MODULES,
);

const ACTIVE_APPEARANCE_PALETTE_IDS = Object.freeze(
  ACTIVE_APPEARANCE_PALETTES.map((palette) => palette.id),
);

export {
  ACTIVE_APPEARANCE_PALETTE_IDS,
  ACTIVE_APPEARANCE_PALETTES,
  APPLICATION_APPEARANCE_MODULES,
  CORE_APPEARANCE_PALETTES,
  composeApplicationPalettes,
};
