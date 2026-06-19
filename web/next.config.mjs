/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  // Suppress yahoo-finance2 warnings
  webpack: (config) => {
    config.externals.push({ 'utf-8-validate': 'commonjs utf-8-validate' });
    return config;
  },
};

export default nextConfig;
