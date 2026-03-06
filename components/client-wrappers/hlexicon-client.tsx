"use client";

import { Hlexicon } from "@/components/hlexicon";

type HlexiconClientProps = {
  term: string;
  definition: string;
  className?: string;
};

/**
 * Client wrapper for Hlexicon component
 * Handles all client-side interactivity while keeping the main component focused
 */
export function HlexiconClient({
  term,
  definition,
  className,
}: HlexiconClientProps) {
  return <Hlexicon className={className} definition={definition} term={term} />;
}

export default HlexiconClient;
