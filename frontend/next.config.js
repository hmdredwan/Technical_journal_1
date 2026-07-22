/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',           // ← Very important for cPanel
  // output: 'export',
  swcMinify: false,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'journal.rribd.org', pathname: '/media/**' },
      { protocol: 'https', hostname: 'journal.rribd.org', pathname: '/api/media/**' },
      
    ],
  },

  reactStrictMode: true,
  trailingSlash: true,

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;