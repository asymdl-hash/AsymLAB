'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getUserTheme, setUserTheme, type Theme } from '@/lib/userPreferences';
import { useAuth } from '@/contexts/AuthContext';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    // Ler preferência do utilizador ao montar
    useEffect(() => {
        if (user?.id) {
            const saved = getUserTheme(user.id);
            setThemeState(saved);
        }
        setMounted(true);
    }, [user?.id]);

    // Aplicar classe dark no <html>
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme, mounted]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        if (user?.id) {
            setUserTheme(user.id, newTheme);
        }
    }, [user?.id]);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    }, [theme, setTheme]);

    // Evitar flash de tema errado durante SSR
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (!context) {
        // Fallback seguro para SSR/prerender — retorna light mode sem acção
        return {
            theme: 'light',
            setTheme: () => { },
            toggleTheme: () => { },
        };
    }
    return context;
}
