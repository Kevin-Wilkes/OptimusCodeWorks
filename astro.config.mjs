// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remarkAlerts } from './src/plugins/remark-alerts.mjs';
import { remarkYouTube } from './src/plugins/remark-youtube.mjs';
import { THUMB_CACHE_DIR, THUMB_PUBLIC_PREFIX, THUMB_FILENAME_RE, buildThumbnailBuffer, remoteThumbnailUrl } from './src/utils/youtube-thumbnail.mjs';
import { rehypeTechTooltips, TECH_TOOLTIPS_DIGEST } from './src/plugins/rehype-tech-tooltips.mjs';
import { getImagesForUrl, getLastModForUrl } from './src/utils/sitemap-images.mjs';
import { themeConfig } from './src/theme.config.ts';
import { isFeatureEnabled, isUrlEnabled } from './src/utils/features.ts';
import rehypeMermaid from 'rehype-mermaid';

/**
 * Client-side Mermaid rendering (Optimus Codeworks change).
 *
 * Diagrams used to be drawn at build time with a headless Chrome browser (Playwright),
 * which Cloudflare's build environment cannot run. Instead, the build now leaves each
 * diagram as text inside `<pre class="mermaid">`, and this script draws them in the
 * visitor's browser. Mermaid is only downloaded on pages that contain a diagram.
 */
const MERMAID_CLIENT_SCRIPT = `
(function () {
  // Shield diagrams from the theme's article styles (code-block and paragraph rules),
  // which otherwise stretch each box and the whole diagram to the full page width.
  var css = [
    'pre.mermaid{all:unset;display:block;margin:2rem auto;text-align:center;overflow-x:auto;white-space:normal;}',
    'pre.mermaid:not([data-processed]){visibility:hidden;min-height:4rem;}',
    // Keep Mermaid's own natural-size cap (inline max-width) so diagrams never scale up to fill the page.
    'pre.mermaid > svg{display:inline-block;height:auto;}',
    'pre.mermaid svg *{box-sizing:content-box;}',
    'pre.mermaid svg p,pre.mermaid svg div,pre.mermaid svg span{margin:0 !important;padding:0 !important;max-width:none !important;width:auto !important;line-height:1.3 !important;}',
    // Finished diagram inside the theme card: keep Mermaid's natural-size cap.
    '.mermaid-diagram-wrapper > svg{height:auto;}'
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // After drawing, give each diagram the same final structure the theme's build-time
  // plugin produced: .mermaid-diagram-wrapper > [svg, .mermaid-diagram-toolbar].
  // The theme's own Expand button and zoom viewer (src/scripts/mermaid-zoom.ts) then work as before.
  function placeInThemeCard(pre) {
    var svg = pre.querySelector('svg');
    if (!svg) return;
    // Accessibility and styling tweaks the theme's plugin applied at build time.
    svg.setAttribute('role', 'img');
    if (!svg.getAttribute('aria-label')) svg.setAttribute('aria-label', 'Mermaid diagram');
    // Match the selectors the theme's zoom script (src/scripts/mermaid-zoom.ts) looks for.
    if (!/^mermaid-/.test(svg.id || '')) svg.id = 'mermaid-' + Math.random().toString(36).slice(2, 10);
    var desc = svg.getAttribute('aria-roledescription') || '';
    svg.setAttribute('aria-roledescription', desc.indexOf('flowchart') === 0 ? 'flowchart' : 'diagram');
    svg.querySelectorAll('g.cluster > rect').forEach(function (r) { r.setAttribute('rx', '12'); r.setAttribute('ry', '12'); });
    svg.querySelectorAll('g.node > rect').forEach(function (r) { r.setAttribute('rx', '8'); r.setAttribute('ry', '8'); });
    var wrapper = pre.closest('.mermaid-diagram-wrapper');
    if (!wrapper) { pre.replaceWith(svg); return; }
    var toolbar = wrapper.querySelector('.mermaid-diagram-toolbar');
    // replaceChildren also drops anything else another script added (such as a copy button).
    if (toolbar) wrapper.replaceChildren(svg, toolbar); else wrapper.replaceChildren(svg);
  }

  var running = null;
  function renderMermaid() {
    if (running) return running;
    running = (async function () {
      var blocks = document.querySelectorAll('pre.mermaid:not([data-processed])');
      if (!blocks.length) return;
      var mod = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
      var mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        // Plain SVG text labels: sized by Mermaid itself, so page CSS cannot stretch them.
        htmlLabels: false,
        flowchart: { htmlLabels: false, useMaxWidth: true, padding: 15, wrappingWidth: 200 },
        themeVariables: {
          darkMode: true,
          background: 'transparent',
          mainBkg: '#1f2937',
          nodeBorder: '#f59e0b',
          clusterBkg: '#111827',
          titleColor: '#f3f4f6',
          textColor: '#f3f4f6',
          lineColor: '#f59e0b',
          arrowheadColor: '#f59e0b'
        }
      });
      await mermaid.run({ nodes: blocks });
      blocks.forEach(placeInThemeCard);
      // Tell the theme's zoom script the diagrams now exist so it can attach its Expand viewer.
      document.dispatchEvent(new Event('mermaid:rendered'));
    })().catch(function (err) {
      console.error('Mermaid rendering failed:', err);
      document.querySelectorAll('pre.mermaid').forEach(function (b) { b.style.visibility = 'visible'; });
    }).finally(function () {
      running = null;
    });
    return running;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderMermaid);
  } else {
    renderMermaid();
  }
  document.addEventListener('astro:page-load', renderMermaid);
})();
`;

/**
 * Rehype plugin: wraps each `<pre class="mermaid">` in the theme's diagram card at build time,
 * using the same markup as `src/plugins/rehype-mermaid-a11y.mjs` (`.mermaid-diagram-wrapper`
 * plus the `.mermaid-expand-btn` toolbar), so the theme's Expand/zoom viewer keeps working.
 * The diagram itself is drawn later in the browser and moved into the card.
 */
function rehypeMermaidCard() {
  /** @param {string} tagName @param {Record<string, any>} [properties] @param {any[]} [children] */
  const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
  const expandIcon = () =>
    el(
      'svg',
      {
        width: '15', height: '15', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', ariaHidden: 'true',
      },
      [
        el('polyline', { points: '15 3 21 3 21 9' }),
        el('polyline', { points: '9 21 3 21 3 15' }),
        el('line', { x1: '21', y1: '3', x2: '14', y2: '10' }),
        el('line', { x1: '3', y1: '21', x2: '10', y2: '14' }),
      ],
    );
  const wrap = (pre) =>
    el('div', { className: ['mermaid-diagram-wrapper'] }, [
      pre,
      el('div', { className: ['mermaid-diagram-toolbar'] }, [
        el(
          'button',
          {
            type: 'button',
            className: ['mermaid-expand-btn'],
            ariaLabel: 'Expand diagram in interactive zoom viewer',
            title: 'Click to expand and zoom diagram',
          },
          [expandIcon(), el('span', {}, [{ type: 'text', value: 'Expand' }])],
        ),
      ]),
    ]);
  const isMermaidPre = (node) =>
    node && node.type === 'element' && node.tagName === 'pre' &&
    Array.isArray(node.properties?.className) && node.properties.className.includes('mermaid');
  /** @param {any} node */
  const walk = (node) => {
    if (!node.children) return;
    const isWrapper = Array.isArray(node.properties?.className) && node.properties.className.includes('mermaid-diagram-wrapper');
    node.children = node.children.map((child) => (!isWrapper && isMermaidPre(child) ? wrap(child) : child));
    node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}

/**
 * Astro integration that adds the client-side Mermaid script to every page's <head>.
 * @returns {import('astro').AstroIntegration}
 */
function mermaidClient() {
  return {
    name: 'mermaid-client',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        injectScript('head-inline', MERMAID_CLIENT_SCRIPT);
      },
    },
  };
}

/**
 * Astro integration ensuring sitemap.xml exists alongside sitemap-index.xml
 * for direct browser requests and legacy crawler compatibility.
 * @returns {import('astro').AstroIntegration}
 */
function sitemapAlias() {
  return {
    name: 'sitemap-alias',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        try {
          const distDir = fileURLToPath(dir);
          const indexFile = path.join(distDir, 'sitemap-index.xml');
          const aliasFile = path.join(distDir, 'sitemap.xml');
          if (fs.existsSync(indexFile)) {
            fs.copyFileSync(indexFile, aliasFile);
            logger.info('`sitemap.xml` created as alias to `sitemap-index.xml`');
          }
        } catch (err) {
          logger.warn(`Failed to create sitemap.xml alias: ${err}`);
        }
      }
    }
  };
}

/**
 * Astro dev-server middleware serving cached YouTube facade thumbnails under `/yt-thumbs/`.
 * Production publishing and HTML post-processing happen in `postBuildHtml()`.
 * @returns {import('astro').AstroIntegration}
 */
function youtubeThumbnails() {
  return {
    name: 'youtube-thumbnails',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(THUMB_PUBLIC_PREFIX, (req, res, next) => {
          const name = path.basename((req.url || '').split('?')[0]);
          const file = path.join(THUMB_CACHE_DIR, name);
          if (!THUMB_FILENAME_RE.test(name) || !fs.existsSync(file)) return next();
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          fs.createReadStream(file).pipe(res);
        });
      },
    },
  };
}

/**
 * Single-pass post-build HTML processor that walks `dist/` once to:
 * 1. Publish cached YouTube facade thumbnails (or heal to remote URL on cache miss)
 * 2. Inline self-contained `/_astro/*.js` module scripts
 * 3. Strip developer HTML comments (`<!-- ... -->`) outside script/style/pre/textarea
 * 4. Verify all `/_astro/*.{css,js}` references exist in `dist/`
 * Each HTML file is read once and written at most once.
 * @returns {import('astro').AstroIntegration}
 */
function postBuildHtml() {
  return {
    name: 'post-build-html',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const astroDir = path.join(distDir, '_astro');
        const ytOutDir = path.join(distDir, THUMB_PUBLIC_PREFIX.slice(1));

        // 0. Prune any disabled top-level feature directories or feed files from dist/
        const featureDirs = /** @type {const} */ ([
          'about',
          'now',
          'blog',
          'photography',
          'log',
          'tags',
          'contact',
        ]);
        for (const seg of featureDirs) {
          if (!isFeatureEnabled(seg)) {
            fs.rmSync(path.join(distDir, seg), { recursive: true, force: true });
          }
        }
        if (!isFeatureEnabled('rss')) {
          fs.rmSync(path.join(distDir, 'rss.xml'), { force: true });
          fs.rmSync(path.join(distDir, 'atom.xml'), { force: true });
        }
        if (!isFeatureEnabled('llms')) {
          fs.rmSync(path.join(distDir, 'llms.txt'), { force: true });
          fs.rmSync(path.join(distDir, 'llms-full.txt'), { force: true });
          fs.rmSync(path.join(distDir, 'llms.json'), { force: true });
        }

        const MAX_INLINE_SCRIPT_BYTES = 3072;
        /** @type {Map<string, string>} */
        const jsCache = new Map();
        if (fs.existsSync(astroDir)) {
          for (const entry of fs.readdirSync(astroDir, { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
            const code = fs.readFileSync(path.join(astroDir, entry.name), 'utf-8').trim();
            // Only inline small (<= 3 KiB) self-contained bundles without external ES module imports
            // or closing script tags; larger bundles stay external and hit the immutable /_astro/ cache.
            if (
              Buffer.byteLength(code, 'utf-8') <= MAX_INLINE_SCRIPT_BYTES &&
              !/\bimport\s*[\w*{]/.test(code) &&
              !/\bfrom\s*['"]/.test(code) &&
              !/<\/script/i.test(code)
            ) {
              jsCache.set(`/_astro/${entry.name}`, code);
            }
          }
        }

        const ytRefRe = new RegExp(`${THUMB_PUBLIC_PREFIX}/([A-Za-z0-9_.-]+\\.webp)`, 'g');
        const scriptRe = /<script\s+type="module"\s+src="(\/_astro\/[^"]+\.js)"><\/script>/g;
        const commentRe = /(<(script|style|pre|textarea)\b[\s\S]*?<\/\2>)|<!--(?!\[if)[\s\S]*?-->/gi;
        const assetRefRe = /["'(](\/_astro\/[^"'()\s?#]+\.(?:css|js))/g;
        const anyAstroFileRe = /\/_astro\/([A-Za-z0-9_.-]+)/g;

        /** @type {Map<string, string | null>} */
        const thumbStatus = new Map();
        /** @type {Map<string, boolean>} */
        const verifiedAssets = new Map();
        /** @type {Map<string, string>} */
        const missingAssets = new Map();
        /** @type {Set<string>} */
        const referencedAstroFiles = new Set();

        let publishedThumbs = 0;
        let inlinedCount = 0;
        let savedBytes = 0;
        let checkedPages = 0;
        let prunedAstroAssets = 0;

        /** @param {string} d */
        const walk = async (d) => {
          for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) {
              if (full === astroDir) continue;
              await walk(full);
            } else if (entry.name.endsWith('.html')) {
              const original = fs.readFileSync(full, 'utf-8');
              let html = original;

              // 1. YouTube thumbnail publishing & fallback healing
              for (const m of html.matchAll(ytRefRe)) {
                const file = m[1];
                if (!THUMB_FILENAME_RE.test(file)) continue;
                if (!thumbStatus.has(file)) {
                  const cached = path.join(THUMB_CACHE_DIR, file);
                  /** @type {string | null} */
                  let fallbackUrl = null;
                  if (!fs.existsSync(cached)) {
                    const videoId = file.slice(0, 11);
                    try {
                      fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });
                      fs.writeFileSync(cached, await buildThumbnailBuffer(videoId));
                      logger.warn(`Re-downloaded missing YouTube thumbnail for ${videoId}`);
                    } catch (err) {
                      logger.warn(
                        `Thumbnail for ${videoId} unavailable (${err instanceof Error ? err.message : String(err)}); using remote URL.`
                      );
                      fallbackUrl = remoteThumbnailUrl(videoId);
                    }
                  }
                  if (!fallbackUrl) {
                    fs.mkdirSync(ytOutDir, { recursive: true });
                    fs.copyFileSync(cached, path.join(ytOutDir, file));
                    publishedThumbs++;
                  }
                  thumbStatus.set(file, fallbackUrl);
                }
                const fallbackUrl = thumbStatus.get(file);
                if (fallbackUrl) {
                  html = html.split(`${THUMB_PUBLIC_PREFIX}/${file}`).join(fallbackUrl);
                }
              }

              // 2. Inline self-contained module scripts
              if (jsCache.size > 0) {
                let pageInlined = false;
                html = html.replace(scriptRe, (match, src) => {
                  const code = jsCache.get(src);
                  if (!code) return match;
                  pageInlined = true;
                  return `<script type="module">${code}</script>`;
                });
                if (pageInlined) inlinedCount++;
              }

              // 3. Strip developer HTML comments
              const beforeStripLen = html.length;
              html = html.replace(commentRe, (_, keep) => keep ?? '');
              if (html.length !== beforeStripLen) {
                savedBytes += beforeStripLen - html.length;
              }

              // 3b. Unwrap inline <a href="/..."> links pointing to disabled features
              // (e.g. inside Markdown article prose or frontmatter HTML blocks)
              html = html.replace(
                /<a\b[^>]*\bhref="(\/[^"#?]*)(?:[?#][^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi,
                (fullMatch, href, innerHtml) => {
                  if (href.startsWith('/_astro/') || href.startsWith('/favicon') || href.startsWith('/og/')) {
                    return fullMatch;
                  }
                  return isUrlEnabled(href) ? fullMatch : innerHtml;
                }
              );

              // Write HTML at most once per page
              if (html !== original) {
                fs.writeFileSync(full, html);
              }

              // 4. Collect and verify /_astro/ references
              checkedPages++;
              for (const m of html.matchAll(anyAstroFileRe)) {
                referencedAstroFiles.add(m[1]);
              }
              for (const m of html.matchAll(assetRefRe)) {
                const ref = m[1];
                let exists = verifiedAssets.get(ref);
                if (exists === undefined) {
                  exists = fs.existsSync(path.join(distDir, ref));
                  verifiedAssets.set(ref, exists);
                }
                if (!exists && !missingAssets.has(ref)) {
                  missingAssets.set(ref, path.relative(distDir, full));
                }
              }
            } else if (/\.(?:xml|json|txt|xsl)$/i.test(entry.name)) {
              const text = fs.readFileSync(full, 'utf-8');
              for (const m of text.matchAll(anyAstroFileRe)) {
                referencedAstroFiles.add(m[1]);
              }
            }
          }
        };

        await walk(distDir);

        // 5. Prune unreferenced /_astro/ files (e.g. inlined scripts or disabled-feature assets)
        if (fs.existsSync(astroDir)) {
          const queue = [...referencedAstroFiles].filter((f) => /\.(?:css|js)$/i.test(f));
          const scanned = new Set(queue);
          while (queue.length > 0) {
            const current = /** @type {string} */ (queue.pop());
            const fullPath = path.join(astroDir, current);
            if (!fs.existsSync(fullPath)) continue;
            const content = fs.readFileSync(fullPath, 'utf-8');
            for (const m of content.matchAll(anyAstroFileRe)) {
              const dep = m[1];
              referencedAstroFiles.add(dep);
              if (/\.(?:css|js)$/i.test(dep) && !scanned.has(dep)) {
                scanned.add(dep);
                queue.push(dep);
              }
            }
          }

          for (const entry of fs.readdirSync(astroDir, { withFileTypes: true })) {
            if (entry.isFile() && !referencedAstroFiles.has(entry.name)) {
              fs.rmSync(path.join(astroDir, entry.name), { force: true });
              prunedAstroAssets++;
            }
          }
        }

        if (publishedThumbs > 0) {
          logger.info(`Published ${publishedThumbs} YouTube thumbnail(s) to ${THUMB_PUBLIC_PREFIX}/`);
        }
        if (inlinedCount > 0) {
          logger.info(`Inlined ${jsCache.size} module script bundle(s) across ${inlinedCount} HTML page(s)`);
        }
        if (prunedAstroAssets > 0) {
          logger.info(`Pruned ${prunedAstroAssets} unreferenced /_astro/ asset(s)`);
        }
        if (savedBytes > 0) {
          logger.info(`Stripped ${(savedBytes / 1024).toFixed(1)} KiB of HTML comments from built pages`);
        }
        if (missingAssets.size > 0) {
          const list = [...missingAssets].map(([asset, page]) => `  ${asset} (first seen in ${page})`).join('\n');
          throw new Error(
            `Built HTML references ${missingAssets.size} missing asset(s). Clear .cache/astro and rebuild:\n${list}`
          );
        }
        logger.info(`All /_astro/ CSS and JS references resolve across ${checkedPages} HTML page(s)`);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  cacheDir: './.cache/astro',
  build: {
    // Small per-page styles are inlined; the shared Tailwind bundle ships as one content-hashed,
    // immutably cached file so it is downloaded once and reused across every navigation and prefetch.
    inlineStylesheets: 'auto',
  },
  experimental: {
    // Caches rendered route HTML and sharp image transforms in `.cache/astro`.
    // Stale cached HTML asset references are guarded at the end of every build by
    // `postBuildHtml()`, and CI supports `CLEAN_BUILD=1` to purge `.cache/astro`.
    incrementalBuild: true,
  },
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'dedupe-tailwind-color-mix-supports',
        generateBundle(_, bundle) {
          const re = /([^{}@]+)\{([a-z-]+):[^{};]+\}@supports \(color:color-mix\(in lab, red, red\)\)\{\1\{\2:([^{};]+)\}\}/g;
          for (const chunk of Object.values(bundle)) {
            if (chunk.type === 'asset' && chunk.fileName.endsWith('.css') && typeof chunk.source === 'string') {
              chunk.source = chunk.source.replace(re, '$1{$2:$3}');
            }
          }
        },
      },
    ],
    build: {
      target: ['chrome111', 'safari16.4', 'firefox113'],
      cssTarget: ['chrome111', 'safari16.4', 'firefox113'],
      // Inline page-specific style chunks (<16 KiB) to avoid extra render-blocking CSS requests,
      // while keeping the shared site-wide Tailwind bundle (~131 KiB raw) as a single external
      // stylesheet and keeping module scripts > 3 KiB as external immutable /_astro/*.js bundles.
      assetsInlineLimit: (filePath, content) => {
        if (filePath.endsWith('.js')) {
          return content.byteLength <= 3072;
        }
        return content.byteLength < 16384;
      },
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.names?.some((n) => n.endsWith('.css'))) {
              return '_astro/styles.[hash][extname]';
            }
            return '_astro/[name].[hash][extname]';
          },
        },
      },
    },
  },
  site: themeConfig.site.url,
  redirects: isFeatureEnabled('tags')
    ? {
        '/tags/infra': '/tags/infrastructure/',
      }
    : {},
  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    processor: unified({
      remarkPlugins: [[remarkAlerts, { version: 'v2-note' }], remarkYouTube],
      rehypePlugins: [
        // Leave diagrams as <pre class="mermaid"> text; mermaidClient() draws them in the browser.
        [rehypeMermaid, { strategy: 'pre-mermaid' }],
        // Wrap each diagram in the theme's card with its Expand button (theme zoom viewer).
        rehypeMermaidCard,
        [rehypeTechTooltips, { digest: TECH_TOOLTIPS_DIGEST }],
      ],
    }),
  },
  integrations: [
    sitemap({
      xslURL: '/sitemap-style.xsl',
      filter(page) {
        return isUrlEnabled(page);
      },
      serialize(item) {
        const lastmod = getLastModForUrl(item);
        if (lastmod) {
          item.lastmod = lastmod;
        }
        const images = getImagesForUrl(item);
        if (images && images.length > 0) {
          // `img` is passed through to the `sitemap` serializer (image sitemap extension) but is not in `SitemapItem`
          /** @type {import('sitemap').SitemapItemLoose} */ (item).img = images;
        }
        return item;
      }
    }),
    mermaidClient(),
    sitemapAlias(),
    youtubeThumbnails(),
    postBuildHtml()
  ],
  prefetch: {
    prefetchAll: true,
    // Prefetch on hover/focus only: pages are 200–400 KB uncompressed, so avoid viewport-wide prefetching.
    defaultStrategy: 'hover',
  }
});
