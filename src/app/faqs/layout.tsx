import type { Metadata } from 'next';
import { faqSections } from './faqData';
import { faqJsonLd, jsonLdString } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'FAQs',
  description: 'Delivery days and times, ordering, payments, packaging and more: answers to common questions about NikFoods.',
  alternates: { canonical: '/faqs' },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd(faqSections)) }} />
      {children}
    </>
  );
}
