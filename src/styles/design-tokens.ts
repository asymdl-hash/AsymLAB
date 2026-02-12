export const designTokens = {
    colors: {
        bgPrimary: '#0a0a0a',
        bgSecondary: '#1a1a1a',
        bgTertiary: '#2a2a2a',
        textPrimary: '#f5f5f5',
        textSecondary: '#a0a0a0',
        textTertiary: '#666666',
        accent: '#00a8e8',
        accentHover: '#0090c8',
        error: '#ff3b30',
        success: '#34c759',
        border: '#333333',
    },
    fonts: {
        display: "'Space Grotesk', sans-serif",
        body: "'IBM Plex Mono', monospace",
    },
    spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
    },
    transitions: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
} as const;

export type DesignTokens = typeof designTokens;
