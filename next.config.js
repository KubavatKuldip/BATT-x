/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Ignore NextAuth v5 beta type incompatibility with Next.js 16 generated types
  typescript: {
    ignoreBuildErrors: true,
  },
}

const withNextIntl = require('next-intl/plugin')(
  // This is the default (also the `src` folder is supported out of the box)
  './i18n.config.ts'
);

module.exports = withNextIntl(nextConfig);
