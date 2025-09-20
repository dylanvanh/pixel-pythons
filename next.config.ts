import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  output: 'standalone',
  /* config options here */
};

export default nextConfig;
