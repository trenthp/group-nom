import { defineConfig } from 'eslint/config'
import coreWebVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'scripts/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  {
    rules: {
      // Apostrophes in JSX text are harmless; escaping them is churn
      'react/no-unescaped-entities': 'off',
      // Real tech debt in pre-existing components - visible as warnings,
      // fix when touching those files
      'react-hooks/static-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
