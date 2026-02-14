/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        // Ativar output file tracing mas com limite de recursão
        outputFileTracingRoot: __dirname,
    },
    // Configuração de output para Vercel
    output: 'standalone',
};

module.exports = nextConfig;
