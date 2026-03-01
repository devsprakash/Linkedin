import express from "express";
import authRoutes from "./auth.route.js";

const router = express.Router();

// Route grouping
router.use("/auth", authRoutes);
/* -------------------- Health Check -------------------- */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    server: "running",
    dbState: mongoose.connection.readyState,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;