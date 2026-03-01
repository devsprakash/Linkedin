import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes/index.route.js";
import globalErrorHandler from "./middleware/errorHandler.js";
import AppError from "./utils/AppError.js";
import logger from "./config/logger.js";

const app = express();

/* -------------------- Fix __dirname in ES6 -------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------- Trust Proxy -------------------- */
app.enable("trust proxy");

/* -------------------- Security Headers -------------------- */
app.use(helmet());

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

/* -------------------- Logging -------------------- */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* -------------------- Body Parsers -------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* -------------------- Data Sanitization -------------------- */
app.use(mongoSanitize());
app.use(xss());

/* -------------------- Compression -------------------- */
app.use(compression());

/* -------------------- Static Files -------------------- */
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- Request Time Middleware -------------------- */
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

/* -------------------- API Routes -------------------- */
app.use("/api/v1", routes);

/* -------------------- 404 Handler -------------------- */
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

/* -------------------- Global Error Handler -------------------- */
app.use(globalErrorHandler);

export default app;