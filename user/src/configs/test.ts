import mongoose, { connect, ConnectOptions } from "mongoose";

declare global {
  var mongooseConn: typeof mongoose | null;
}

interface IMongoOptions {
  uri: string;
  isDev?: boolean;
  options?: ConnectOptions;
}

let cachedConnection: typeof mongoose | null = global.mongooseConn || null;

export const connectToDB = async ({
  uri,
  isDev = false,
  options = {},
}: IMongoOptions): Promise<typeof mongoose> => {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!uri) {
    throw new Error("MongoDB URI not provided");
  }

  console.log("🔌 Establishing MongoDB connection...");

  const connection = await connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: isDev ? 5 : 10,
    minPoolSize: isDev ? 1 : 2,
    ...options,
  });

  cachedConnection = connection;

  if (isDev) {
    global.mongooseConn = connection;
  }

  console.log("✅ MongoDB connected");

  connection.connection.on("error", (err) => {
    console.error("❌ MongoDB error:", err);
    cachedConnection = null;
  });

  connection.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
    cachedConnection = null;
  });

  return connection;
};
