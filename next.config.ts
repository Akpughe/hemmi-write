import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["re2", "jsdom", "metascraper", "metascraper-author", "metascraper-readability", "metascraper-title", "metascraper-description", "metascraper-date", "@metascraper/helpers"],
};

export default nextConfig;
