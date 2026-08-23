/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: "6mb"
    }
  }
};

export default nextConfig;
