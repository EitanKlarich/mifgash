import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const configuredFrontendOrigins = [
  process.env.FRONTEND_URL || "",
  process.env.APP_URL || "",
  process.env.SHARED_APP_URL || "",
]
  .flatMap((val) => val.split(","))
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const STATIC_ALLOWED_ORIGINS = new Set<string>([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
  ...configuredFrontendOrigins,
]);

const LOCALHOST_DEV_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isSameRequestOrigin(origin: string, req: express.Request): boolean {
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwardedHosts = String(req.headers["x-forwarded-host"] || "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    const directHost = String(req.headers.host || "").trim().toLowerCase();

    return (
      forwardedHosts.includes(originHost) ||
      (Boolean(directHost) && directHost === originHost)
    );
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string, req: express.Request): boolean {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return (
    STATIC_ALLOWED_ORIGINS.has(normalizedOrigin) ||
    LOCALHOST_DEV_ORIGIN_PATTERN.test(normalizedOrigin) ||
    isSameRequestOrigin(normalizedOrigin, req)
  );
}

app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    if (!origin) {
      return callback(null, { origin: false });
    }
    if (isAllowedOrigin(origin, req)) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      });
    }
    return callback(null, { origin: false });
  })
);
app.use(express.json());

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mifgash Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
