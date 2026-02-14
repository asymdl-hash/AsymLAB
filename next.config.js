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
    // OBRIGATÓRIO manter false para evitar RangeError
    // .nftignore NÃO resolve o problema
    outputFileTracing: false,
};

module.exports = nextConfig;
