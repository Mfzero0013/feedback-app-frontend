import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';

export default [
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        plugins: {
            import: importPlugin,
        },
        rules: {
            // Common rules
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'warn',
            'no-unused-vars': 'warn',
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-template': 'error',
            'object-shorthand': 'error',
            'quote-props': ['error', 'as-needed'],
            'arrow-body-style': ['error', 'as-needed'],
            'no-else-return': 'error',
            'prefer-destructuring': 'warn',
            
            // Code style
            'indent': ['error', 4, { 'SwitchCase': 1 }],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
            'eol-last': ['error', 'always'],
            'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
            'space-before-function-paren': ['error', 'always'],
            'space-before-blocks': 'error',
            'keyword-spacing': 'error',
            'space-infix-ops': 'error',
            'arrow-spacing': 'error',
            'no-trailing-spaces': 'error',
            'no-multi-spaces': 'error',
            'space-in-parens': ['error', 'never'],
            'array-bracket-spacing': ['error', 'never'],
            'object-curly-spacing': ['error', 'always'],
            'comma-spacing': 'error',
            'key-spacing': 'error',
            'no-mixed-spaces-and-tabs': 'error',
            'no-whitespace-before-property': 'error',
            'func-call-spacing': ['error', 'never'],
            'import/order': ['error', {
                'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
            }],
        },
    },
    {
        ignores: [
            'node_modules/',
            'dist/',
            'build/',
            '*.config.js',
            '.vscode/',
            '.idea/',
            '.DS_Store',
            '**/__tests__/',
            '**/*.test.js',
            '**/*.spec.js'
        ]
    }
];
