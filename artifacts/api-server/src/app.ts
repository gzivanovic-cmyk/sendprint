import path from "node:path";
import fs from "node:fs";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Accept raw ZPL as text/plain (legacy SendPrint.exe compatibility) and as
// application/octet-stream (some clients send it as binary). The print route
// handles both shapes alongside the canonical JSON body.
app.use(express.text({ type: ["text/plain", "application/zpl", "text/zpl"], limit: "2mb" }));
app.use(express.raw({ type: "application/octet-stream", limit: "2mb" }));

app.use("/api", router);

// In production builds (e.g. the Docker image) the dashboard's compiled
// static assets are copied alongside the API server and served from the
// same port. STATIC_DIR defaults to ./public relative to the process cwd
// so the runtime image only needs to expose a single port.
const staticDir = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.resolve(process.cwd(), "public");

if (fs.existsSync(path.join(staticDir, "index.html"))) {
  logger.info({ staticDir }, "Serving dashboard static files");
  app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
  app.get(/^\/(?!api(\/|$)).*/, (_req: Request, res: Response, next: NextFunction) => {
    res.sendFile(path.join(staticDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else {
  logger.info(
    { staticDir },
    "Dashboard static assets not found; running API-only (set STATIC_DIR to enable)",
  );
}

export default app;
