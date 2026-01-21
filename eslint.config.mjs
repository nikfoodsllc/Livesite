import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'src/components/dialogs/ForgotPasswordDialog.tsx',
      'src/lib/emailAnalytics.ts',
      'src/components/dialogs/SignupDialog.tsx',
      'src/app/page.tsx',
      'src/components/admin/EmailAnalytics.tsx',
      'src/app/checkout/page.tsx',
      'src/lib/email.ts',
      'src/components/layout/Header/Header.tsx',
      'src/components/account/AddressDialog.tsx'
    ],
  },
  ...compat.extends('next/core-web-vitals'),
];

export default config;