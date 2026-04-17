import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "a.espncdn.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/leaderboard",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
