import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const host = request.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

    const manifest = {
        name: isLocal ? 'AsymLAB LOCAL' : 'AsymLAB',
        short_name: isLocal ? 'AsymLAB LOCAL' : 'AsymLAB',
        description: isLocal
            ? 'AsymLAB — Modo Local (acesso a pastas NAS)'
            : 'Sistema de Gestão Clínica Profissional',
        start_url: '/',
        display: 'standalone',
        background_color: isLocal ? '#0a2e1a' : '#0f172a',
        theme_color: isLocal ? '#166534' : '#0f172a',
        orientation: 'portrait-primary',
        icons: [
            { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        screenshots: [
            { src: '/screenshots/desktop.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
            { src: '/screenshots/mobile.png', sizes: '750x1334', type: 'image/png', form_factor: 'narrow' },
        ],
        categories: ['medical', 'health', 'productivity'],
        shortcuts: [
            {
                name: 'Dashboard',
                short_name: 'Dashboard',
                description: 'Acesso rápido ao dashboard',
                url: '/dashboard',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
            },
            {
                name: 'Pacientes',
                short_name: 'Pacientes',
                description: 'Gestão de pacientes',
                url: '/dashboard/patients',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
            },
        ],
        prefer_related_applications: false,
    };

    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/manifest+json',
        },
    });
}
