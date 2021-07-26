const fs = require('fs');
const path = require('path');
const { print } = require('graphql/language/printer');
const gql = require('graphql-tag');

const typeDefsFile = path.join(__dirname, 'packages', 'api', 'api-typedefs.graphql');
const typeDefs = gql(fs.readFileSync(typeDefsFile, 'utf8'));

module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    warnOnUnsupportedTypeScriptVersion: true
  },
  plugins: ['graphql'],
  env: {
    es6: true,
    node: true
  },
  rules: {
    'no-console': 'error',
    'prettier/prettier': ['error', require('./.prettierrc')],
    'graphql/template-strings': [
      'error',
      {
        env: 'apollo',
        schemaString: print(typeDefs)
      }
    ]
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        'plugin:import/typescript',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint'
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off'
      }
    },
    {
      files: ['*.tsx'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'prettier/react'
      ],
      env: {
        browser: true
      },
      rules: {
        'react/prop-types': 0
      },
      settings: {
        react: {
          version: 'detect'
        }
      }
    },
    {
      files: ['*.spec.ts'],
      extends: ['plugin:jest/recommended']
    }
  ]
};
