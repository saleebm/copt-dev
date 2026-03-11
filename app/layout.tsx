import type { Metadata, Viewport } from "next";
import type React from "react";
import { ibmPlexMono, spaceGrotesk } from "@/lib/fonts";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// TODO: Set up SEO metadata
export const metadata: Metadata = {
  metadataBase: new URL("https://www.copt.dev"),
  title: "copt.dev",
  description: "My personal website and blog.",
  openGraph: {
    title: "copt.dev",
    description: "My personal website and blog.",
    url: "https://www.copt.dev",
    siteName: "copt.dev",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${ibmPlexMono.variable} ${spaceGrotesk.variable} h-full bg-background`}
      lang="en"
    >
      {/* deploy-test */}
      <body className="h-full text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
