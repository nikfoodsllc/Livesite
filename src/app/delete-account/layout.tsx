import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: 'How to delete your NikFoods account and what is removed.',
  alternates: { canonical: '/delete-account' },
};

export default function DeleteAccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
