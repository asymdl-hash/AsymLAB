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
    // Desativar output tracing automático para evitar "RangeError: Maximum call stack size exceeded"
    // causado por estruturas de ficheiros complexas durante o build
    outputFileTracing: false,
};

module.exports = nextConfig;
