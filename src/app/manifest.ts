import type { MetadataRoute } from "next";

/** X4: web app manifest so FaceVerse can be installed on phones and desktops. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FaceVerse",
    short_name: "FaceVerse",
    description: "Face & voice recognition, attendance and visitor log that runs on your device.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#5b5ef0",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
