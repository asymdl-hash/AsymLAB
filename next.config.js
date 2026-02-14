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
    // Desativar output tracing para evitar RangeError
    // Nota: Isto causa problemas com client-reference-manifest em rotas dinâmicas
    // mas é preferível a falhar o build completamente
    outputFileTracing: false,
};

module.exports = nextConfig;
