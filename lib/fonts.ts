import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

// IBM Plex Mono for body text (monospace)
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Space Grotesk for headings (serif)
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-space-grotesk",
  display: "swap",
});
