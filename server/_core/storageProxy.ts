import type { Express } from "express";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";
import { getUserBySessionToken } from "../db";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    // REQUIRE A VALID SESSION (audit M18): this handed back a signed URL to a stored object
    // with NO auth — an open proxy for anyone who learned a key. Keys are minted by
    // authenticated upload flows (server/storage.ts), so the objects are user content.
    // Same-origin <img> requests carry the cookie, so authed users' content still loads.
    const token = parseCookie(req.headers.cookie ?? "")[COOKIE_NAME];
    const user = token ? (await getUserBySessionToken(token).catch(() => null))?.user ?? null : null;
    if (!user) {
      res.status(401).send("Unauthorized");
      return;
    }

    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
