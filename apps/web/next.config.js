const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
    ],
  },
  // Renamed from experimental.serverComponentsExternalPackages in Next 15
  serverExternalPackages: ['@prisma/client'],
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // keep compiled pages warm for 60s of inactivity
    pagesBufferLength: 10, // keep up to 10 pages compiled at once
  },
  async redirects() {
    return [
      { source: '/app', destination: '/dashboard/individual', permanent: true },
      { source: '/app/login', destination: '/login', permanent: true },
      { source: '/app/register', destination: '/register', permanent: true },
      { source: '/app/drives', destination: '/dashboard/individual/drives', permanent: true },
      { source: '/app/drives/:id', destination: '/dashboard/individual/drives/:id', permanent: true },
      { source: '/app/trees', destination: '/dashboard/individual/adoptions', permanent: true },
      { source: '/app/trees/:id', destination: '/dashboard/individual/adoptions/:id', permanent: true },
      { source: '/app/nurseries', destination: '/dashboard/individual/nurseries', permanent: true },
      { source: '/app/nurseries/:id', destination: '/dashboard/individual/nurseries/:id', permanent: true },
      { source: '/app/orders', destination: '/dashboard/individual/orders', permanent: true },
      { source: '/app/orders/:id', destination: '/dashboard/individual/orders/:id', permanent: true },
      { source: '/app/cart', destination: '/dashboard/individual/orders/cart', permanent: true },
      { source: '/app/checkout', destination: '/dashboard/individual/orders/checkout', permanent: true },
      { source: '/app/groups', destination: '/dashboard/individual/groups', permanent: true },
      { source: '/app/groups/:id', destination: '/dashboard/individual/groups/:id', permanent: true },
      { source: '/app/following', destination: '/dashboard/individual/community', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
