import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/auth/auth.model.js";
import sendEmail from "../utils/sendEmail.js";
import response from "../utils/response.js";


/* =====================
   SIGN UP
===================== */
export const signup = async (req, res) => {
  try {

    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return response.conflict(res, "Email already registered");
    }

    const user = await User.create({ name, email, password });

    const accessToken = await user.generateAuthToken();
    const refreshToken = await user.generateRefreshToken();

    return response.created(res, {
      user,
      accessToken,
      refreshToken,
    }, "Signup successful");
  } catch (err) {
    return response.error(res, { message: err.message });
  }
};

/* =====================
   LOGIN
===================== */
export const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return response.unauthorized(res, "Invalid email or password");
    }

    const accessToken = await user.generateAuthToken();
    const refreshToken = await user.generateRefreshToken();

    return response.success(res, {
      data: { user, accessToken, refreshToken },
      message: "Login successful",
    });
  } catch (err) {
    return response.error(res, { message: err.message });
  }
};

/* ================= LOGOUT ================= */
export const logout = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.refreshToken = null;
    user.accessToken =  null;
    await user.save();
  }

  res.json({ message: "Logged out successfully" });
};

/* =====================
   FORGOT PASSWORD
===================== */
export const forgotPassword = async (req, res) => {
  try {

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return response.notFound(res, "User not found");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendEmail({
      to: email,
      subject: "Password Reset Verification Code",
      html: `
        <h2>Password Reset</h2>
        <p>Your verification code is:</p>
        <h1>${code}</h1>
        <p>This code is valid for 10 minutes.</p>
      `,
    });

    return response.success(res, {
      message: "Verification code sent to registered email",
    });
  } catch (err) {
    return response.error(res, { message: err.message });
  }
};

/* =====================
   RESET PASSWORD
===================== */
export const resetPassword = async (req, res) => {
  try {

    const { email, code, newPassword } = req.body;

    const hashedCode = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordCode: hashedCode,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return response.badRequest(res, "Invalid or expired verification code");
    }

    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return response.success(res, {
      message: "Password reset successful",
    });
  } catch (err) {
    return response.error(res, { message: err.message });
  }
};

/* =====================
   REFRESH TOKEN
===================== */
export const refreshToken = async (req, res) => {
  try {

    const { refreshToken: token } = value;

    const payload = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(payload.id);
    if (!user || user.refreshToken !== token) {
      return response.forbidden(res, "Invalid refresh token");
    }

    const newAccessToken = await user.generateAuthToken();

    return response.success(res, {
      data: { accessToken: newAccessToken },
      message: "Access token refreshed",
    });
  } catch (err) {
    return response.unauthorized(res, "Invalid or expired refresh token");
  }
};