/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to reduce memory in dev
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
    // Enable modern image formats for smaller payloads
    formats: ["image/avif", "image/webp"],
  },
  // Compress responses (gzip/brotli) — only in standalone mode or behind a proxy
  compress: true,

  // Production optimizations
  poweredByHeader: false,
  generateEtags: true,

  // Add custom headers for caching and security
  async headers() {
    return [
      {
        // Cache Next.js static assets aggressively
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache images with revalidation
        source: "/:path*.(svg|png|webp|avif|jpg|jpeg|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // API routes — short cache, stale-while-revalidate
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // Security headers for all routes
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https://logo.clearbit.com https://*.googleusercontent.com data:; connect-src 'self' https://query*.finance.yahoo.com https://scanner.tradingview.com; font-src 'self'",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  webpack: (config, { dev, isServer }) => {
    config.externals.push({ "utf-8-validate": "commonjs utf-8-validate" });

    // Reduce memory in dev mode for heavy pages
    if (dev) {
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }

    // Production: split vendor chunks for better caching
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separate chunk for heavy charting library
            charts: {
              test: /[\\/]node_modules[\\/](lightweight-charts)[\\/]/,
              name: "vendor-charts",
              chunks: "all",
              priority: 20,
            },
            // Separate chunk for framer-motion
            motion: {
              test: /[\\/]node_modules[\\/](framer-motion)[\\/]/,
              name: "vendor-motion",
              chunks: "all",
              priority: 20,
            },
            // Separate chunk for markdown rendering
            markdown: {
              test: /[\\/]node_modules[\\/](react-markdown|remark-gfm)[\\/]/,
              name: "vendor-markdown",
              chunks: "all",
              priority: 20,
            },
            // Default vendor chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
          },
        },
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

// Wrap with bundle analyzer if ANALYZE=true is set
let config = nextConfig;
if (process.env.ANALYZE === "true") {
  const bundleAnalyzer = (await import("@next/bundle-analyzer")).default;
  config = bundleAnalyzer({ enabled: true })(nextConfig);
}

export default config;
