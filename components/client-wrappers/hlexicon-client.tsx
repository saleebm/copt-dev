"use client";

import { Hlexicon } from "@/components/hlexicon";

interface HlexiconClientProps {
  className?: string;
  definition: string;
  term: string;
}

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
