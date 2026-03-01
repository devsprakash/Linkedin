import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./src/app.js";
import logger from "./src/config/logger.js";

/* -------------------- Env -------------------- */
dotenv.config();

/* -------------------- Uncaught Exceptions -------------------- */
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION 💥", err);
  process.exit(1);
});

/* -------------------- DB -------------------- */
const mongoURI =
  process.env.DATABASE_URL?.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
  ) || process.env.MONGODB_URI;

mongoose
  .connect(mongoURI)
  .then(() => logger.info("DB connected"))
  .catch((err) => {
    logger.error("DB error", err);
    process.exit(1);
  });



/* -------------------- Server -------------------- */
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send({ status: true, msg: "backend is running" })
})

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});


/* -------------------- Unhandled Rejection -------------------- */
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION 💥", err);
  server.close(() => process.exit(1));
});

/* -------------------- SIGTERM -------------------- */
process.on("SIGTERM", () => {
  logger.info("SIGTERM received");
  server.close(() => process.exit(0));
});