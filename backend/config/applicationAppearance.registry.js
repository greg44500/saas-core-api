const CORE_APPEARANCE_PALETTE_IDS = Object.freeze([
    'core',
    'refreshing-summer-fun',
    'leafy-green-garden',
    'golden-peachy-glow',
]);
const APPEARANCE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * Point de composition des palettes réellement intégrées dans le produit.
 *
 * Après clonage, une application dérivée ajoute ici les descriptors de ses
 * modules d'apparence. Déclarer un identifiant ne crée aucune couleur libre :
 * le frontend doit fournir les tokens CSS correspondants pour ce même id.
 *
 * Exemple : { paletteIds: ['brand-blue'] }
 */
const APPLICATION_APPEARANCE_MODULES = Object.freeze([]);

function composeApplicationPaletteIds(modules = []) {
    if (!Array.isArray(modules)) {
        throw new TypeError('modules must be an array');
    }

    const paletteIds = [...CORE_APPEARANCE_PALETTE_IDS];

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

        const modulePaletteIds = moduleDefinition.paletteIds ?? [];
        if (!Array.isArray(modulePaletteIds)) {
            throw new TypeError(
                `modules[${moduleIndex}].paletteIds must be an array`,
            );
        }

        modulePaletteIds.forEach((paletteId) => {
            if (
                typeof paletteId !== 'string'
                || !APPEARANCE_ID_PATTERN.test(paletteId)
            ) {
                throw new TypeError(`Invalid appearance palette id: ${paletteId}`);
            }

            if (paletteIds.includes(paletteId)) {
                throw new TypeError(`Duplicate appearance palette id: ${paletteId}`);
            }

            paletteIds.push(paletteId);
        });
    });

    return Object.freeze(paletteIds);
}

const ACTIVE_APPEARANCE_PALETTE_IDS = composeApplicationPaletteIds(
    APPLICATION_APPEARANCE_MODULES,
);

export {
    ACTIVE_APPEARANCE_PALETTE_IDS,
    APPLICATION_APPEARANCE_MODULES,
    CORE_APPEARANCE_PALETTE_IDS,
    composeApplicationPaletteIds,
};
