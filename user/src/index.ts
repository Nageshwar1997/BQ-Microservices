import "dotenv/config";
import path from "path";
import express, { Request, Response } from "express";
import { parse } from "qs";
import { envs } from "./envs";
import { router } from "./router";
import { connectToDB } from "@beautinique/be-configs";
import {
  databaseConfigs,
  errorLog,
  isDbConnected,
  requestLog,
} from "./configs";
import {
  CorsMiddleware,
  DatabaseMiddleware,
  RequestMiddleware,
  ResponseMiddleware,
} from "@beautinique/be-middlewares";
import { ORIGINS } from "./constants";

const app = express();

// ----------------- MIDDLEWARES ORDER -----------------

// 1. Assign requestId first (for tracing logs)
app.use(RequestMiddleware.requestId);

// 2. Body parsers & static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("public")));
app.set("query parser", (str: string) => parse(str));

// 3. Logger (logs all requests)
app.use(requestLog);

// 4. Custom middlewares
app.use(ResponseMiddleware.success);
app.use(CorsMiddleware.checkOrigin({ origins: ORIGINS }));
app.use(DatabaseMiddleware.checkConnection(isDbConnected));

// ----------------- ROUTES -----------------
// Home Route
app.get("/", (_: Request, res: Response) =>
  res.success(200, "Welcome to the User Service API"),
);

// API Routes
app.use("/api", router);

// ----------------- ERROR HANDLING -----------------
app.use(ResponseMiddleware.notFound);
app.use(errorLog);
app.use(ResponseMiddleware.error);

(async () => {
  try {
    await connectToDB(databaseConfigs);
    // await Promise.all([redisService.connect(), mailService.checkConnection()]);

    app.listen(envs.port, () => {
      console.log(`Server running on port: ${envs.port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();

export { app };
