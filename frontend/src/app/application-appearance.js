const CORE_APPEARANCE_PALETTES = Object.freeze([
  Object.freeze({
    id: 'core',
    label: 'Core Atlantique',
  }),
]);

const APPEARANCE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * Point de composition des palettes réellement intégrées dans le produit.
 *
 * Un module dérivé peut fournir `palettes: [{ id, label }]`. Le même `id`
 * doit être déclaré côté backend et disposer de ses tokens CSS via
 * `:root[data-palette="<id>"]` et, si nécessaire, sa variante `.dark`.
 */
const APPLICATION_APPEARANCE_MODULES = Object.freeze([]);

function composeApplicationPalettes(modules = []) {
  if (!Array.isArray(modules)) {
    throw new TypeError('modules must be an array');
  }

  const palettes = CORE_APPEARANCE_PALETTES.map((palette) => ({ ...palette }));

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
      ) {
        throw new TypeError('Invalid appearance palette descriptor');
      }

      if (palettes.some((entry) => entry.id === palette.id)) {
        throw new TypeError(`Duplicate appearance palette id: ${palette.id}`);
      }

      palettes.push({
        id: palette.id,
        label: palette.label.trim(),
      });
    });
  });

  return Object.freeze(
    palettes.map((palette) => Object.freeze({ ...palette })),
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
