const PASSWORD_POLICY_VERSION = '2026-09-10';

const PASSWORD_POLICY = Object.freeze({
    version: PASSWORD_POLICY_VERSION,
    minLength: 15,
    maxLength: 128,
    levels: Object.freeze([
        Object.freeze({ key: 'weak', label: 'Faible', minScore: 0 }),
        Object.freeze({ key: 'good', label: 'Correct', minScore: 3 }),
        Object.freeze({ key: 'strong', label: 'Robuste', minScore: 5 }),
    ]),
    scoring: Object.freeze({
        lengthBands: Object.freeze([
            Object.freeze({ minLength: 15, points: 1 }),
            Object.freeze({ minLength: 20, points: 1 }),
            Object.freeze({ minLength: 28, points: 1 }),
        ]),
        characterClassBands: Object.freeze([
            Object.freeze({ minClasses: 2, points: 1 }),
            Object.freeze({ minClasses: 4, points: 1 }),
        ]),
        uniqueRatio: Object.freeze({ minRatio: 0.6, points: 1 }),
    }),
});

const COMMON_WEAK_TERMS = Object.freeze([
    'password',
    'motdepasse',
    'qwerty',
    'azerty',
    'welcome',
    'bienvenue',
    'letmein',
    'admin',
]);

const LEETSPEAK_MAP = Object.freeze({
    '@': 'a',
    '4': 'a',
    '3': 'e',
    '1': 'i',
    '!': 'i',
    '0': 'o',
    '$': 's',
    '5': 's',
    '7': 't',
});

const normalizeForWeakPasswordDetection = (password) =>
    password
        .toLocaleLowerCase('fr-FR')
        .split('')
        .map((character) => LEETSPEAK_MAP[character] ?? character)
        .join('')
        .replace(/[^\p{L}\p{N}]/gu, '');

const hasRepeatedPattern = (password) => {
    const normalized = password.toLocaleLowerCase('fr-FR');

    if (/^(.)\1{5,}$/u.test(normalized)) {
        return true;
    }

    return /^(.{1,4})\1{3,}$/u.test(normalized);
};

const isAscendingOrDescendingSequence = (value) => {
    if (value.length < 6) {
        return false;
    }

    const codePoints = Array.from(value, (character) => character.codePointAt(0));
    const direction = Math.sign(codePoints[1] - codePoints[0]);

    if (![1, -1].includes(direction)) {
        return false;
    }

    return codePoints.slice(1).every((codePoint, index) =>
        codePoint - codePoints[index] === direction);
};

const hasTrivialSequence = (password) => {
    const compact = password
        .toLocaleLowerCase('fr-FR')
        .replace(/[^a-z0-9]/g, '');

    if (isAscendingOrDescendingSequence(compact)) {
        return true;
    }

    const knownSequences = [
        '0123456789',
        '1234567890',
        'abcdefghijklmnopqrstuvwxyz',
        'zyxwvutsrqponmlkjihgfedcba',
        'azertyuiop',
        'poiuytreza',
        'qwertyuiop',
        'poiuytrewq',
    ];

    return knownSequences.some((sequence) =>
        compact.length >= 6 && sequence.includes(compact));
};

const containsCommonWeakTerm = (password) => {
    const normalized = normalizeForWeakPasswordDetection(password);

    return COMMON_WEAK_TERMS.some((term) => {
        const index = normalized.indexOf(term);

        if (index === -1) {
            return false;
        }

        const remainder = normalized.slice(0, index) + normalized.slice(index + term.length);

        return remainder.length <= 8 || /^\d+$/.test(remainder);
    });
};

const getCharacterClassCount = (password) => [
    /\p{Ll}/u.test(password),
    /\p{Lu}/u.test(password),
    /\p{N}/u.test(password),
    /[^\p{L}\p{N}\s]/u.test(password),
    /\s/u.test(password),
].filter(Boolean).length;

const evaluatePasswordStrength = (password) => {
    if (typeof password !== 'string' || password.length === 0) {
        return { key: 'weak', label: 'Faible', score: 0 };
    }

    let score = 0;

    for (const band of PASSWORD_POLICY.scoring.lengthBands) {
        if (password.length >= band.minLength) {
            score += band.points;
        }
    }

    const classCount = getCharacterClassCount(password);
    for (const band of PASSWORD_POLICY.scoring.characterClassBands) {
        if (classCount >= band.minClasses) {
            score += band.points;
        }
    }

    const uniqueRatio = new Set(Array.from(password)).size / Array.from(password).length;
    if (uniqueRatio >= PASSWORD_POLICY.scoring.uniqueRatio.minRatio) {
        score += PASSWORD_POLICY.scoring.uniqueRatio.points;
    }

    const level = [...PASSWORD_POLICY.levels]
        .reverse()
        .find((candidate) => score >= candidate.minScore)
        ?? PASSWORD_POLICY.levels[0];

    return {
        key: level.key,
        label: level.label,
        score,
    };
};

const validateNewPasswordAgainstPolicy = (password) => {
    const reasons = [];

    if (typeof password !== 'string') {
        return { valid: false, reasons: ['invalid_type'] };
    }

    if (password.length < PASSWORD_POLICY.minLength) {
        reasons.push('too_short');
    }

    if (password.length > PASSWORD_POLICY.maxLength) {
        reasons.push('too_long');
    }

    if (hasRepeatedPattern(password)) {
        reasons.push('repeated_pattern');
    }

    if (hasTrivialSequence(password)) {
        reasons.push('trivial_sequence');
    }

    if (containsCommonWeakTerm(password)) {
        reasons.push('common_weak_password');
    }

    return {
        valid: reasons.length === 0,
        reasons,
        strength: evaluatePasswordStrength(password),
    };
};

const getPublicPasswordPolicy = () => ({
    version: PASSWORD_POLICY.version,
    minLength: PASSWORD_POLICY.minLength,
    maxLength: PASSWORD_POLICY.maxLength,
    levels: PASSWORD_POLICY.levels,
    scoring: PASSWORD_POLICY.scoring,
    guidance: [
        'Les espaces, lettres, chiffres et caractères spéciaux sont autorisés.',
        'Les suites évidentes, répétitions et mots de passe trop courants sont refusés.',
        'Une phrase de passe longue et difficile à deviner est recommandée.',
    ],
});

export {
    PASSWORD_POLICY,
    evaluatePasswordStrength,
    getPublicPasswordPolicy,
    validateNewPasswordAgainstPolicy,
};
