import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guards of Atlantis MMR Tracker",
    short_name: "GoA MMR",
    description: "Track match results and MMR for Guards of Atlantis II.",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1a14",
    theme_color: "#1c1a14",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
