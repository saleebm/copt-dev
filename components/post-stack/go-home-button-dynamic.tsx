import dynamic from "next/dynamic";

// Import the GoHomeButton without SSR to avoid hydration issues
// This ensures the component only renders on the client side
export const GoHomeButtonDynamic = dynamic(
  () =>
    import("./go-home-button").then((mod) => ({ default: mod.GoHomeButton })),
  {
    ssr: false,
    loading: () => null, // No loading component needed for such a simple button
  }
);
