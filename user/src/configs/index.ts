import { LoggerMiddleware } from "@beautinique/be-middlewares";
import { connection } from "mongoose";

export const databaseConfigs = {
  uri: "",
  isDev: true,
};

export const isDbConnected = () => connection.readyState === 1;

export const { requestLog, errorLog, logger } = LoggerMiddleware.createLogger({
  logDir: "logs",
  level: "info",
});
