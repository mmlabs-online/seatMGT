import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server bundle for the Docker runtime image (docker/Dockerfile).
  output: "standalone",
};

export default nextConfig;
