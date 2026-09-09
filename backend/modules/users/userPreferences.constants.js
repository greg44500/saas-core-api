const USER_THEME = Object.freeze({
    SYSTEM: 'system',
    LIGHT: 'light',
    DARK: 'dark',
});

const USER_FONT_FAMILY = Object.freeze({
    INTER: 'inter',
    GEIST: 'geist',
    MANROPE: 'manrope',
    SYSTEM: 'system',
});

const USER_PALETTE = Object.freeze({
    CORE: 'core',
});

const USER_ACCESSIBILITY_MODE = Object.freeze({
    STANDARD: 'standard',
    ENHANCED: 'enhanced',
});

const DEFAULT_USER_COMFORT_PREFERENCES = Object.freeze({
    theme: USER_THEME.SYSTEM,
    fontFamily: USER_FONT_FAMILY.INTER,
    paletteId: USER_PALETTE.CORE,
    accessibilityMode: USER_ACCESSIBILITY_MODE.STANDARD,
});

export {
    DEFAULT_USER_COMFORT_PREFERENCES,
    USER_ACCESSIBILITY_MODE,
    USER_FONT_FAMILY,
    USER_PALETTE,
    USER_THEME,
};
