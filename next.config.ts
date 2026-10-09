import type { NextConfig } from "next";

/**
 * Static export so the site can be hosted on GitHub Pages / any static host.
 * For a GitHub Pages *project* site (https://<user>.github.io/<repo>/) set
 * NEXT_PUBLIC_BASE_PATH=/<repo> at build time. Leave it empty for a
 * user site (<user>.github.io) or a custom domain.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
