/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        // Excluir pastas não-essenciais do file tracing para evitar possíveis problemas
        outputFileTracingExcludes: {
            '*': [
                './supabase/**',
                './docs/**',
                './scripts/**',
                './.git/**',
                './**/*.db',
                './**/*.db-shm',
                './**/*.db-wal',
            ],
        },
    },
};

module.exports = nextConfig;
