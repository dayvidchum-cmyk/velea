import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getUserByEmail, updateUserPasswordHash } from "../db";
import { hashPassword } from "./password";

// One-shot password recovery via env vars — phone-friendly (no SQL). Set RESET_LOGIN_EMAIL +
// RESET_LOGIN_PASSWORD in Railway → the matching user's password is reset on the auto-redeploy,
// then REMOVE both vars. Safe: only someone with Railway access can set them, and it only ever
// touches the one named account. A no-op when the vars are absent.
async function maybeResetLoginPassword() {
  const email = process.env.RESET_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.RESET_LOGIN_PASSWORD;
  if (!email || !password) return;
  try {
    const user = await getUserByEmail(email);
    if (!user) { console.log(`[reset] no user found for ${email} — nothing changed`); return; }
    await updateUserPasswordHash(user.id, await hashPassword(password));
    console.log(`[reset] password reset for ${email} (user ${user.id}). Now REMOVE the RESET_LOGIN_* env vars.`);
  } catch (err) {
    console.error("[reset] failed:", err);
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust the first proxy (Cloudflare / Manus gateway) so that
  // req.protocol is 'https' and secure cookies are set correctly.
  app.set("trust proxy", 1);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Lightweight health check for the host (no DB, no auth).
  app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  await maybeResetLoginPassword();

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
