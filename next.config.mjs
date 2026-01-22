/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports for smaller bundle sizes
    optimizePackageImports: ['docx'],
  },
};

export default nextConfig;
