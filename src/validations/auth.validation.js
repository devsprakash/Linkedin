import { body } from "express-validator";

/* ================= SIGNUP ================= */
export const signupValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address"),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/\d/).withMessage("Password must contain a number"),

  body("mobile")
    .optional()
    .isMobilePhone("en-IN").withMessage("Invalid mobile number"),
];

/* ================= LOGIN ================= */
export const loginValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email"),

  body("password")
    .notEmpty().withMessage("Password is required"),
];

/* ================= FORGOT PASSWORD ================= */
export const forgotPasswordValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email"),
];

/* ================= RESET PASSWORD ================= */
export const resetPasswordValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email"),

  body("code")
    .notEmpty().withMessage("Verification code is required")
    .isLength({ min: 6, max: 6 }).withMessage("Invalid code"),

  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/\d/).withMessage("Password must contain a number"),
];

/* ================= REFRESH TOKEN ================= */
export const refreshTokenValidation = [
  body("refreshToken")
    .notEmpty().withMessage("Refresh token is required"),
];