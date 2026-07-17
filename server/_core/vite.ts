import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // Fall through to the SPA shell for NAVIGATIONS only. A missing content-hashed asset
  // (a stale page importing /assets/Chart-<oldhash>.js after a deploy) must 404, NOT get
  // 200 index.html (audit 2026-07-17, H1): an HTML body under a .js URL breaks the dynamic
  // import into a white screen AND — because the service worker cache-firsts .js and stores
  // any res.ok body — poisons the cache with HTML under the chunk URL, wedging the route
  // until the next SW generation. express.static already served every asset that exists, so
  // anything with an asset extension reaching here is genuinely missing.
  const ASSET_EXT = /\.(?:js|mjs|css|png|jpg|jpeg|svg|webp|gif|woff2?|ttf|ico|map|json|webmanifest)$/;
  app.use("*", (req, res) => {
    const pathname = req.originalUrl.split("?")[0];
    if (ASSET_EXT.test(pathname) || pathname.startsWith("/assets/")) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
