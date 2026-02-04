import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'test.com',
      },
    ],
  },
  reactStrictMode: false,
};

export default nextConfig;
