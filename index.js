// src/server.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import app from "./src/app.js";
import logger from "./src/config/logger.js";

/* -------------------- Fix __dirname for ES Modules -------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------- Load Environment Variables -------------------- */
dotenv.config({ path: path.join(__dirname, "../.env") });

/* -------------------- Debug Logs -------------------- */
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("DATABASE_PASSWORD exists:", !!process.env.DATABASE_PASSWORD);

/* -------------------- Uncaught Exception Handler -------------------- */
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

/* -------------------- Database Connection -------------------- */
const DB = process.env.DATABASE_URL?.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

const mongoURI =
  DB ||
  process.env.MONGODB_URI ||
  "mongodb+srv://root:akki909@cluster0.sm3rshd.mongodb.net/ProConnect?retryWrites=true&w=majority";

console.log("Connecting to MongoDB...");

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info("DB connection successful!");
  })
  .catch((err) => {
    logger.error("DB connection error:", err);
    process.exit(1);
  });

/* -------------------- Start Server -------------------- */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(
    `Server running on port ${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});

/* -------------------- Unhandled Promise Rejection -------------------- */
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...");
  logger.error(err.name, err.message);
  logger.error(err.stack);
  server.close(() => {
    process.exit(1);
  });
});

/* -------------------- SIGTERM Handler -------------------- */
process.on("SIGTERM", () => {
  logger.info("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    logger.info("💥 Process terminated!");
  });
});

export default server;