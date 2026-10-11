import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JalSentry (जल संतरी) — Heat & Water Decision Support MVP',
  description: 'Environmental decision-support system prioritizing water-shortage verification and suspected-leak inspections during peak heat events.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
