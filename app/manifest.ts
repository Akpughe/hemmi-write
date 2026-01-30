import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hemmi - AI Writing Assistant",
    short_name: "Hemmi",
    description:
      "Write research papers, essays, and reports 10x faster with AI assistance.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#171717",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
