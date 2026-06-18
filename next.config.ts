import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer/Chromium não podem ser empacotados pelo bundler do servidor —
  // precisam ser carregados como módulos externos no runtime Node.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
};

export default nextConfig;
