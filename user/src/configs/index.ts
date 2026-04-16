import { envs } from "@/envs";
import { LoggerMiddleware } from "@beautinique/be-middlewares";
import { connection } from "mongoose";

export const databaseConfigs = {
  uri: envs.is_dev ? envs.mongo_uri.dev : envs.mongo_uri.prod,
  isDev: true,
  dbName: "user",
};

export const isDbConnected = () => connection.readyState === 1;

export const { requestLog, errorLog, logger } = LoggerMiddleware.createLogger({
  logDir: "logs",
  level: "info",
});
