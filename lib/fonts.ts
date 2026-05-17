import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";

// IBM Plex Mono for UI chrome (sidebars, buttons, code, terminal)
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Space Grotesk for headings
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// Inter for long-form article body
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-inter",
  display: "swap",
});
