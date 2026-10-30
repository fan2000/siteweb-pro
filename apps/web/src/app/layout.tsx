import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOTIF — La tech qui fait le job.',
  description: 'Découvrez des produits et services tech avec des parcours d’achat transparents.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
