import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["re2", "metascraper", "metascraper-author", "metascraper-readability", "@metascraper/helpers"],
};

export default nextConfig;
