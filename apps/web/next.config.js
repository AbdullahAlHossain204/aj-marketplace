/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Add real product-image domains (S3/CDN) here in later phases.
    remotePatterns: [],
  },
};

module.exports = nextConfig;
