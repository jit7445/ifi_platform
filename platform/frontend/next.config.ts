import type { NextConfig } from "next";

// Read at build time and serialized into the standalone server, so the
// Docker image takes API_URL as a build argument. The local default is 8010
// because the backend's host port is remapped off 8000 in development.
const apiUrl = (process.env.API_URL ?? "http://localhost:8010").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  // Pinned so a lockfile in a parent directory is not mistaken for the workspace root,
  // which would nest the standalone server under extra path segments.
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${apiUrl}/v1/:path*` },
      // The refresh cookie is scoped to Path=/v1/auth by the API, so auth calls
      // must also be reachable under that same-origin path for the browser to send it.
      { source: "/v1/auth/:path*", destination: `${apiUrl}/v1/auth/:path*` },
    ];
  },
};

export default nextConfig;
