// Provider registry. Order matters: providers are tried in priority order
// (lowest number first). The first non-null `match()` wins. Add new
// providers here — routes don't need to change.
import type { GhPrSummary } from "../gh";
import {
  blogProvider,
  concreteProvider,
  findingProvider,
  sightProvider,
} from "./post-type";
import type { ProviderSummary, ReviewProvider } from "./types";

export const REVIEW_PROVIDERS: ReviewProvider[] = [
  findingProvider,
  sightProvider,
  blogProvider,
  concreteProvider,
].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

export function summarizePr(pr: GhPrSummary): ProviderSummary {
  for (const provider of REVIEW_PROVIDERS) {
    const summary = provider.match(pr);
    if (summary) {
      return summary;
    }
  }
  return {
    id: "unknown",
    postType: null,
    label: "Unknown",
    predictedSlug: null,
    mdxPath: null,
  };
}

export function providerById(id: string): ReviewProvider | undefined {
  return REVIEW_PROVIDERS.find((p) => p.id === id);
}

export type { ProviderSummary, ReviewProvider } from "./types";
