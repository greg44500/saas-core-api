import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

const jsdocIntegrityRules = {
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-property-names': 'error',
    'jsdoc/check-tag-names': 'error',
    'jsdoc/check-types': 'error',
};

export default [
    {
        ignores: [
            'frontend/**',
            'node_modules/**',
            'coverage/**',
        ],
    },
    js.configs.recommended,
    {
        files: ['backend/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.nodeBuiltin,
            },
        },
        plugins: {
            jsdoc,
        },
        rules: {
            ...jsdocIntegrityRules,
        },
    },
    {
        files: ['backend/tests/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.nodeBuiltin,
            },
        },
    },
];
