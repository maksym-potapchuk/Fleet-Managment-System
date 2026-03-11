import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Standalone output for production Docker image (~100MB vs ~1GB)
  // Used by Dockerfile.prod — has no effect on `npm run dev`
  output: "standalone",
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/media/:path*",
        destination: `${backendUrl}/media/:path*`,
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
