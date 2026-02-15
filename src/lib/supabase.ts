import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Helper functions for authentication
export const auth = {
    signIn: async (emailOrUsername: string, password: string) => {
        // Se não tem @, é username → converter para email interno
        const email = emailOrUsername.includes('@')
            ? emailOrUsername
            : `${emailOrUsername.toLowerCase().trim()}@asymlab.app`;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    getSession: async () => {
        const { data, error } = await supabase.auth.getSession();
        return { data, error };
    },

    getUser: async () => {
        const { data, error } = await supabase.auth.getUser();
        return { data, error };
    },
};
