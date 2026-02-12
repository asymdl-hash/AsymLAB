import type { Metadata } from 'next';
import { Outfit, Roboto_Mono } from 'next/font/google';
import './globals.css';
import PWARegister from '@/components/PWARegister';

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

const robotoMono = Roboto_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'AsymLAB | Precision Engineering',
    description: 'Sistema de Gestão Clínica de Alta Precisão',
    manifest: '/manifest.json',
    icons: {
        icon: '/icons/icon-192x192.png',
        apple: '/icons/icon-192x192.png',
    },
    applicationName: 'AsymLAB',
    keywords: ['gestão clínica', 'saúde', 'precisão', 'técnico', 'zirkonzahn'],
};

export const viewport = {
    themeColor: '#121212', // Dark Titanium Black
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
        <html lang="pt" className="dark">
            <head>
                <link rel="icon" href="/icons/icon-192x192.png" />
                {/* Preloading important fonts */}
                <meta name="theme-color" content="#121212" />
            </head>
            <body className={`${outfit.variable} ${robotoMono.variable} font-sans antialiased bg-[#121212] text-white selection:bg-[#ff6600] selection:text-black`}>
                <PWARegister />
                {children}
            </body>
        </html>
    );
}
