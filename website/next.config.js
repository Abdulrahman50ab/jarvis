/** @type {import('next').NextConfig} */
const isDesktopBuild = process.env.DESKTOP_BUILD === 'true';

const nextConfig = {
  ...(isDesktopBuild ? { output: 'export' } : {}),
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
