import express from "express";
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

const app = express();

/* -------------------- Fix __dirname -------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------- Trust Proxy -------------------- */
app.enable("trust proxy");

/* -------------------- Security -------------------- */
app.use(helmet());

/* -------------------- Rate Limiter -------------------- */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use("/api", limiter);

/* -------------------- CORS -------------------- */
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
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

/* -------------------- Sanitization -------------------- */
app.use(mongoSanitize());
app.use(xss());

/* -------------------- Compression -------------------- */
app.use(compression());

/* -------------------- Static Files -------------------- */
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- Routes -------------------- */
app.use("/api/v1", routes);

/* -------------------- 404 -------------------- */
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

/* -------------------- Error Handler -------------------- */
app.use(globalErrorHandler);

export default app;