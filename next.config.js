/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },
  // 确保环境变量在构建时可用
  env: {
      TRYON_AWS_API_URL: process.env.TRYON_AWS_API_URL,
      TRYON_AWS_API_KEY: process.env.TRYON_AWS_API_KEY,
  },
}

module.exports = nextConfig

