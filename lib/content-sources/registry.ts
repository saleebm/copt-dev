/**
 * Content provider registry.
 * Loads all configured providers and aggregates their NormalizedPost outputs.
 */

import type { ContentProvider, NormalizedPost, ProviderResult } from "./schema";

export class ProviderRegistry {
  private readonly providers: ContentProvider[] = [];

  register(provider: ContentProvider): void {
    if (this.providers.some((p) => p.id === provider.id)) {
      throw new Error(`Provider "${provider.id}" already registered`);
    }
    this.providers.push(provider);
  }

  async getAll(): Promise<ProviderResult[]> {
    const results: ProviderResult[] = [];

    for (const provider of this.providers) {
      const posts = await provider.getPosts();
      results.push({
        posts,
        providerId: provider.id,
        sourceType: provider.sourceType,
      });
    }

    return results;
  }

  async getAllPosts(): Promise<NormalizedPost[]> {
    const results = await this.getAll();
    return results.flatMap((r) => r.posts);
  }

  getProviderIds(): string[] {
    return this.providers.map((p) => p.id);
  }
}

/**
 * Create a default registry with the MDX filesystem provider
 * and the JSON provider (if records/posts/ exists).
 */
export async function createDefaultRegistry(): Promise<ProviderRegistry> {
  const { MdxProvider } = await import("./mdx-provider");
  const { JsonProvider } = await import("./json-provider");
  const registry = new ProviderRegistry();
  registry.register(new MdxProvider());
  registry.register(new JsonProvider());
  return registry;
}
