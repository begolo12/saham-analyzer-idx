/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to reduce memory in dev
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    config.externals.push({ 'utf-8-validate': 'commonjs utf-8-validate' });

    // Reduce memory in dev mode for heavy pages
    if (dev) {
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }

    return config;
  },
  // Increase memory limit for larger bundles
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;