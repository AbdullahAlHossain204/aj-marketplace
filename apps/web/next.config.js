/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a minimal, self-contained server bundle (only the files
  // actually needed at runtime) — this is what apps/web/Dockerfile copies
  // into the final production image, instead of shipping the full
  // node_modules tree.
  output: "standalone",
  images: {
    // Add real product-image domains (S3/CDN) here in later phases.
    remotePatterns: [],
  },
};

module.exports = nextConfig;
