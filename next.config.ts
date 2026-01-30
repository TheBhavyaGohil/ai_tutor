/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: ["localhost:3000", "192.168.x.x:3000"], // Replace with your actual IP
  },
};

export default nextConfig;