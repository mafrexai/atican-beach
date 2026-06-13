import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.10.55'],
  turbopack: {
    root: 'C:\\Users\\User\\Desktop\\mydev\\aticanbeach\\atican-beach',
  },
};

export default nextConfig;