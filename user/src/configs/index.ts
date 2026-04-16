import { LoggerMiddleware } from "@beautinique/be-middlewares";
import { connection } from "mongoose";

export const databaseConfigs = {
  uri: "mongodb://localhost:27017",
  isDev: true,
  dbName: "user",
};

export const isDbConnected = () => connection.readyState === 1;

export const { requestLog, errorLog, logger } = LoggerMiddleware.createLogger({
  logDir: "logs",
  level: "info",
});
