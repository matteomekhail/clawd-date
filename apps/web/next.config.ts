import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: {
    root: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."),
  },
};

export default config;
