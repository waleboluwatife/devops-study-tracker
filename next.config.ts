import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Screenshots are compressed in the browser first; this is a safety margin.
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
