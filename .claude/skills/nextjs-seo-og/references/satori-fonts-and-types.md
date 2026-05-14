# Satori (next/og): fonts and the ArrayBuffer img-src problem

`next/og`'s `ImageResponse` renders JSX via Satori. Three sharp edges to know about.

## 1. Satori font format support

Satori supports **TTF, OTF, and WOFF**. It does **not** support **WOFF2**.

Google Fonts serves WOFF2 to modern browsers by default. If you request the CSS endpoint with a current Chrome user-agent, you get WOFF2 URLs and Satori can't decode them.

### The fix: spoof an older UA, prefer non-WOFF2 matches

```ts
let fontPromise: Promise<ArrayBuffer> | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  const cssRes = await fetch(
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap",
    {
      headers: {
        // Older WebKit UA → Google returns WOFF (Satori can decode).
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    }
  );
  const css = await cssRes.text();
  const matches = Array.from(
    css.matchAll(
      /src:\s*url\((https:\/\/[^)]+)\)\s*format\('(woff2?|truetype|opentype)'\)/g
    )
  );
  // Prefer non-WOFF2 since Satori can't decode WOFF2.
  const decodable = matches.filter((m) => m[2] !== "woff2");
  const chosen = decodable[decodable.length - 1] ?? matches[matches.length - 1];
  if (!chosen) throw new Error("Could not parse a font URL from Google Fonts CSS");
  const fontRes = await fetch(chosen[1]);
  return fontRes.arrayBuffer();
}
```

Cache the result in a module-level promise so each cold lambda only fetches once:

```ts
function getFontBuffer(): Promise<ArrayBuffer> {
  if (!fontPromise) fontPromise = loadFont();
  return fontPromise;
}
```

Then pass to `ImageResponse`:

```ts
return new ImageResponse(<OgFrame ... />, {
  ...OG_SIZE,
  fonts: [
    { name: "Space Grotesk", data: await getFontBuffer(), style: "normal", weight: 700 },
  ],
});
```

### Why not `next/font/google`?

`next/font/google` returns a CSS variable and font face declarations meant for browser consumption. Satori needs the raw font binary, which isn't exposed by the `next/font` API. Fetch the binary yourself.

### Alternative: bundle a TTF

If you want zero network dependency, drop a `.ttf` into the repo (e.g., `public/fonts/`) and `readFile` it. Trade-off: adds binary weight to the repo but removes the build-time/cold-start fetch.

## 2. Loading a local image into the OG JSX

Per the [official docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image#using-nodejs-runtime-with-local-assets), there are two supported patterns:

### Pattern A: base64 data URL

```ts
const b64 = await readFile(join(process.cwd(), "public/logo.png"), "base64");
const logoSrc = `data:image/png;base64,${b64}`;
// <img src={logoSrc} ... />
```

Cleanest types — `logoSrc` is a string, no casts. Slightly larger payload (base64 is ~33% bigger than binary), but the OG image is rendered to PNG, so the data URL is only in memory during rendering, not in the final output.

### Pattern B: ArrayBuffer + cast

```ts
const logoData = await readFile(join(process.cwd(), "public/logo.png"));
const logoSrc = Uint8Array.from(logoData).buffer as unknown as string;
// <img src={logoSrc} ... />
```

Runtime: Satori accepts the buffer directly. TypeScript: React's `<img src>` is typed as `string`, so the cast is required. The cast is documented as the intended escape hatch.

Both patterns produce identical rendered PNGs. Pick whichever the project's reviewers prefer.

## 3. The `@ts-expect-error` divergence

The Next.js docs example uses:

```tsx
{/* @ts-expect-error Satori accepts ArrayBuffer/typed arrays for <img src> at runtime */}
<img src={logoSrc} height="100" />
```

This **works in stand-alone `tsc --noEmit`** (the assignment is an error → directive consumed → green).

But it **fails in `next build`'s built-in typecheck** (Next 16+) with:

```
Type error: Unused '@ts-expect-error' directive.
```

The two checkers use slightly different type universes for JSX `<img src>`. There is no `tsconfig` flag that reconciles them.

### The reliable fix

Drop the directive entirely. Cast at the loader (Pattern B above) and type the prop as `string`:

```ts
// lib/og-image-shared.tsx
export async function loadOgAssets() {
  const [logo, font] = await Promise.all([getLogoBuffer(), getFontBuffer()]);
  return {
    logoSrc: Uint8Array.from(logo).buffer as unknown as string,
    fonts: [...],
  };
}

interface OgFrameProps {
  logoSrc: string;  // not ArrayBuffer
  // ...
}
```

Now both checkers see a `string` flowing into `<img src>` — both green. The runtime value is still the ArrayBuffer; Satori reads the bytes correctly.

Or use Pattern A (base64 data URL) — same outcome, no cast needed, but slightly different byte path.

## 4. Module-level caching for cold starts

Both the logo and the font benefit from module-level caching:

```ts
let logoPromise: Promise<Buffer> | null = null;
function getLogoBuffer(): Promise<Buffer> {
  if (!logoPromise) logoPromise = readFile(join(process.cwd(), LOGO_REL_PATH));
  return logoPromise;
}
```

On warm lambdas, repeated OG image renders skip both the disk read and the Google Fonts fetch. On cold starts, each takes ~50-200ms but only once per instance.

## Reference implementation

`lib/og-image-shared.tsx` in this repo. It exports `loadOgAssets()` (returns `{ logoSrc, fonts }`) and an `<OgFrame>` component used by both `app/opengraph-image.tsx` and `app/api/og/[slug]/route.tsx`. The two routes only differ in the props they pass to `<OgFrame>` (eyebrow, title, footer).
