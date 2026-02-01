import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler: true, // Temporarily disabled to prevent timeout issues
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  // Ensure MongoDB is never bundled for the client
  serverExternalPackages: ['mongodb'],
  // Additional webpack configuration to exclude Node.js modules from client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Node.js built-in modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        'fs/promises': false,
        url: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        zlib: false,
        events: false,
      };

      // Exclude mongodb from client bundle completely
      config.externals = config.externals || [];
      config.externals.push('mongodb');
    }
    return config;
  },
};

export default nextConfig;
