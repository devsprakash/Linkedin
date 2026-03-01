import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./src/app.js";
import logger from "./src/config/logger.js";

/* -------------------- ENV -------------------- */
dotenv.config();

/* -------------------- PORT -------------------- */
const PORT = process.env.PORT || 5000;

/* -------------------- UNCAUGHT EXCEPTIONS -------------------- */
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION 💥", err);
  process.exit(1);
});

/* -------------------- ROOT HEALTH CHECK -------------------- */
app.get("/", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Backend is running 🚀",
    uptime: process.uptime(),
  });
});

/* -------------------- DB CONNECTION -------------------- */
const mongoURI =
  process.env.DATABASE_URL?.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
  ) || process.env.MONGODB_URI;

if (!mongoURI) {
  logger.error("MongoDB URI is missing");
  process.exit(1);
}

let server;

mongoose
  .connect(mongoURI)
  .then(() => {
    logger.info("DB connected successfully");

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("DB connection failed 💥", err);
    process.exit(1);
  });

/* -------------------- UNHANDLED PROMISE REJECTION -------------------- */
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION 💥", err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

/* -------------------- SIGTERM -------------------- */
process.on("SIGTERM", () => {
  logger.info("SIGTERM received 👋");
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});