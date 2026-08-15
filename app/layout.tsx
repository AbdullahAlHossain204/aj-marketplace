import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AJ Marketplace',
    template: '%s | AJ Marketplace',
  },
  description: 'Shop thousands of products from trusted sellers on AJ Marketplace.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
