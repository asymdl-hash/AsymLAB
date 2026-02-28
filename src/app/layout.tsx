import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PWARegister from '@/components/PWARegister';
import DynamicMeta from '@/components/DynamicMeta';

// Inter: A fonte padrão para interfaces modernas e limpas (SaaS Premium)
const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'AsymLAB | Smart Clinic',
    description: 'Gestão Clínica Inteligente',
    manifest: '/manifest.json',
    icons: {
        icon: '/icons/icon-192x192.png',
        apple: '/icons/icon-192x192.png',
    },
    applicationName: 'AsymLAB',
    keywords: ['gestão clínica', 'saúde', 'inteligente', 'pacientes'],
};

export const viewport = {
    themeColor: '#ffffff', // Clean white theme for Soft SaaS
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt">
            <head>
                <link rel="icon" href="/icons/icon-192x192.png" />
            </head>
            <body className={`${inter.variable} font-sans antialiased bg-background text-foreground selection:bg-primary/20 selection:text-primary-foreground`}>
                <PWARegister />
                <DynamicMeta />
                {children}
            </body>
        </html>
    );
}
