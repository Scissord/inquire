import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nurdaulet.com',
      },
    ],
  },
  reactStrictMode: false,
}

export default nextConfig;
