/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "images.unsplash.com",
      "plus.unsplash.com",
      "upload.wikimedia.org",
      "localhost",
      "127.0.0.1",
      "gujarat-weekend-backend.onrender.com",
    ],
  },
};

module.exports = nextConfig;
