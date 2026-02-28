'use client';

import { useEffect } from 'react';

export default function DynamicMeta() {
    useEffect(() => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (isLocal) {
            // Título
            document.title = document.title.replace('AsymLAB', 'AsymLAB LOCAL');

            // Theme color
            let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
            if (meta) {
                meta.content = '#166534';
            } else {
                meta = document.createElement('meta');
                meta.name = 'theme-color';
                meta.content = '#166534';
                document.head.appendChild(meta);
            }
        }
    }, []);

    return null;
}
