import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  distDir: process.env.BUILD_DIR || ".next",
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx", "mdx"],
  // Version-skew protection for the PM2 cluster: when the client's build ID
  // doesn't match the server's, Next.js triggers a full reload instead of
  // throwing "Failed to find Server Action". Set by deploy.sh from DEPLOY_ID.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  // Enable new caching and pre-rendering behavior
  cacheComponents: true,
  reactCompiler: true,
  experimental: {
    mdxRs: true,
    inlineCss: true,
    // Forward browser logs to the terminal for easier debugging
    cachedNavigations: true,
    optimisticRouting: true,
    serverComponentsHmrCache: true, // disable HMR for server components for local development (HMR = hot module replacement)
  },
  logging: {
    browserToTerminal: true,
    // 'error' — errors only (default)
    // 'warn'  — warnings and errors
    // true    — all console output
    // false   — disabled
  },
  turbopack: {
    // no workspaces
    root: path.join(__dirname, ".."),
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  allowedDevOrigins: ["copt.local", "copt.localhost"],
};

export default nextConfig;
