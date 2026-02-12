import type { Metadata } from 'next';
import { Rajdhani, Roboto_Mono, Inter } from 'next/font/google';
import './globals.css';
import PWARegister from '@/components/PWARegister';

// Fonte técnica quadrada para Títulos e UI Principal (Estilo CAD)
const rajdhani = Rajdhani({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    variable: '--font-tech',
    display: 'swap',
});

// Fonte mono para dados e números
const robotoMono = Roboto_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

// Fonte neutra para textos longos (leitura)
const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
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
    keywords: ['gestão clínica', 'saúde', 'zirkonzahn', 'cad', 'cam'],
};

export const viewport = {
    themeColor: '#0a0a0a',
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
        <html lang="pt" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/icons/icon-192x192.png" />
            </head>
            {/* O bg-background aqui adapta-se automaticamente ao tema do sistema ou classe 'dark' */}
            <body className={`${rajdhani.variable} ${robotoMono.variable} ${inter.variable} font-sans antialiased bg-background text-foreground selection:bg-[#ff6600] selection:text-black`}>
                <PWARegister />
                {children}
            </body>
        </html>
    );
}
