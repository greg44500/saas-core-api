import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const jsdocIntegrityRules = {
  'jsdoc/check-param-names': 'error',
  'jsdoc/check-property-names': 'error',
  'jsdoc/check-tag-names': 'error',
  'jsdoc/check-types': 'error',
};

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      jsdoc,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...jsdocIntegrityRules,
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components/shared/tooltip',
              message: 'Utiliser la primitive shadcn/Base UI depuis @/components/ui/tooltip.',
            },
          ],
          patterns: [
            {
              group: ['**/components/shared/tooltip'],
              message: 'Les tooltips doivent utiliser la primitive canonique @/components/ui/tooltip.',
            },
          ],
        },
      ],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.nodeBuiltin,
      },
    },
  },
];
