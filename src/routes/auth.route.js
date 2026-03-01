import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
} from "../validations/auth.validation.js";

import { validate } from "../validations/validate.js";
import { forgotPassword , signup , login , logout , resetPassword , refreshToken } from "../controllers/auth.controller.js";

const router = express.Router();

// Auth routes
router.post("/signup", signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);
router.post("/forgot-password", forgotPasswordValidation, validate, forgotPassword);
router.post("/reset-password", resetPasswordValidation, validate, resetPassword);
router.post("/refresh-token", refreshTokenValidation, validate, refreshToken);
router.post("/logout", protect, logout);

export default router;