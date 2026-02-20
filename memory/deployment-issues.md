# Deployment Build Failures & Fixes

## Incident: Feb 20, 2026 — Coolify build failed

### Problem 1: ERR_REQUIRE_ESM at build time (jsdom)

**Symptom:** Next.js build fails during "Collecting page data" for `/api/sources/refetch-metadata`:
```
Error: Failed to load external module jsdom: Error [ERR_REQUIRE_ESM]: require() of ES Module
/app/node_modules/@exodus/bytes/encoding-lite.js from
/app/node_modules/html-encoding-sniffer/lib/html-encoding-sniffer.js not supported.
```

**Root cause:** `lib/utils/contentExtractor.ts` had a static top-level import:
```ts
import { JSDOM } from "jsdom";
```
`jsdom` is listed in `serverExternalPackages` in `next.config.ts`, so Next.js externalizes it
and uses `require('jsdom')` at build time. But `jsdom@27` → `html-encoding-sniffer` →
`@exodus/bytes` (ESM-only) breaks `require()`.

**Fix:** Replace static import with a lazy dynamic import helper (same pattern used for metascraper):
```ts
// In contentExtractor.ts — removed static import, added:
async function getJSDOM(html: string, options?: { url?: string }) {
  const { JSDOM } = await import("jsdom");
  return new JSDOM(html, options);
}
```
Then updated `extractAcademicMetadataFromHtml`, `extractContentFallback`, and
`extractReadableContent` to be async and `await getJSDOM(...)`.

**Pattern:** Any package in `serverExternalPackages` that has ESM-only transitive deps
must be dynamically imported (never statically). This was already done for metascraper
in commit 479cc37.

---

### Problem 2: Node version too old for jsdom@27

**Symptom:** npm ci warnings during build:
```
npm warn EBADENGINE package: 'jsdom@27.4.0',
  required: { node: '^20.19.0 || ^22.12.0 || >=24.0.0' },
  current: { node: 'v20.18.1' }
```
`nixpacks.toml` had `nodejs_20` which resolved to `v20.18.1` from the cached nix snapshot —
one patch version below the minimum required by jsdom@27 and its deps.

**Fix:** Bumped `nixpacks.toml` from `nodejs_20` to `nodejs_22`:
```toml
[phases.setup]
nixPkgs = ["nodejs_22", "re2"]
```

---

### Packages currently in serverExternalPackages (next.config.ts)
These must all be lazily imported (never static top-level):
- `re2`
- `jsdom`
- `metascraper`, `metascraper-author`, `metascraper-readability`, `metascraper-title`,
  `metascraper-description`, `metascraper-date`, `@metascraper/helpers`
