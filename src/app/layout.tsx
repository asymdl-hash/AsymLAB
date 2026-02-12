import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
    title: 'AsymLAB - Gestão Clínica',
    description: 'Progressive Web App para Gestão Clínica',
    manifest: '/manifest.json',
    themeColor: '#00a8e8',
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'AsymLAB',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt">
            <head>
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
            </head>
            <body>{children}</body>
        </html>
    );
}
