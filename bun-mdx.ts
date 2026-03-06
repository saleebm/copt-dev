/// <reference types="bun-types" />
// ---cut---
import mdx from "@mdx-js/esbuild";
import { type BunPlugin, plugin } from "bun";

await plugin(mdx() as unknown as BunPlugin);
