import jwt from "jsonwebtoken";
import { promisify } from "util";
import User from "../models/auth/auth.model.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

/* ===================== PROTECT ROUTES ===================== */
export const protect = catchAsync(async (req, res, next) => {
  let token;

  // 1️⃣ Get token from header or cookie
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError(
        "You are not logged in. Please log in to access this resource.",
        401
      )
    );
  }

  // 2️⃣ Verify token
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // 3️⃣ Check if user still exists
  const user = await User.findById(decoded.id).select("-password -__v");
  if (!user) {
    return next(
      new AppError("User belonging to this token no longer exists.", 401)
    );
  }

  // 4️⃣ Optional: check account active
  if (user.isActive === false) {
    return next(
      new AppError("Your account is deactivated. Contact support.", 403)
    );
  }

  // 5️⃣ Grant access
  req.user = user;
  req.userId = user._id;
  req.token = token;

  next();
});


/* ===================== ROLE RESTRICTION ===================== */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          403
        )
      );
    }
    next();
  };
};

/* ===================== OPTIONAL AUTH ===================== */
export const optionalAuth = catchAsync(async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next();

    const decoded = await promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id).select("-password -__v");
    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id;
    }
  } catch (err) {
    // ignore invalid token
  }
  next();
});















// import jwt from "jsonwebtoken";
// import { promisify } from "util";
// import crypto from "crypto";
// import User from "../models/auth/auth.model.js";
// // import Activity from "../models/Activity.js";
// import AppError from "../utils/AppError.js";
// import catchAsync from "../utils/catchAsync.js";
// import logger from "../config/logger.js";
// // import redisClient from "../config/redis.js";

// /* ===================== PROTECT ROUTES ===================== */
// export const protect = catchAsync(async (req, res, next) => {
//   let token;

//   if (req.headers.authorization?.startsWith("Bearer")) {
//     token = req.headers.authorization.split(" ")[1];
//   } else if (req.cookies?.jwt) {
//     token = req.cookies.jwt;
//   }

//   if (!token) {
//     return next(
//       new AppError(
//         "You are not logged in. Please log in to access this resource.",
//         401
//       )
//     );
//   }

//   const isBlacklisted = await redisClient.get(`blacklist:${token}`);
//   if (isBlacklisted) {
//     return next(new AppError("Token is invalid or expired", 401));
//   }

//   const decoded = await promisify(jwt.verify)(
//     token,
//     process.env.JWT_SECRET
//   );

//   const user = await User.findById(decoded.id).select("-password -__v");
//   if (!user) {
//     return next(
//       new AppError("User belonging to this token no longer exists.", 401)
//     );
//   }

//   if (user.changedPasswordAfter(decoded.iat)) {
//     return next(
//       new AppError("User recently changed password. Please log in again.", 401)
//     );
//   }

//   if (user.accountStatus !== "active") {
//     return next(
//       new AppError("Your account is not active. Please contact support.", 403)
//     );
//   }

//   const sessionKey = `session:${user._id}:${decoded.sessionId || "default"}`;
//   const sessionValid = await redisClient.get(sessionKey);

//   if (!sessionValid) {
//     return next(new AppError("Session expired. Please log in again.", 401));
//   }

//   await redisClient.expire(sessionKey, 24 * 60 * 60);

//   req.user = user;
//   req.userId = user._id;
//   req.token = token;

//   logUserActivity(user._id, req).catch(err =>
//     logger.error("Activity logging failed:", err)
//   );

//   next();
// });

// /* ===================== ROLE RESTRICTION ===================== */
// export const restrictTo = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user || !roles.includes(req.user.role)) {
//       return next(
//         new AppError("You do not have permission to perform this action", 403)
//       );
//     }
//     next();
//   };
// };

// /* ===================== PERMISSION CHECK ===================== */
// export const checkPermission = (permission) => {
//   return async (req, res, next) => {
//     if (!req.user) {
//       return next(new AppError("Authentication required", 401));
//     }

//     if (req.user.role === "superadmin") return next();

//     const hasPermission = await userHasPermission(
//       req.user._id,
//       permission
//     );

//     if (!hasPermission) {
//       return next(
//         new AppError("You do not have permission to perform this action", 403)
//       );
//     }

//     next();
//   };
// };

// /* ===================== OPTIONAL AUTH ===================== */
// export const optionalAuth = catchAsync(async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) return next();

//     const decoded = await promisify(jwt.verify)(
//       token,
//       process.env.JWT_SECRET
//     );
//     const user = await User.findById(decoded.id).select("-password -__v");

//     if (user?.accountStatus === "active") {
//       req.user = user;
//       req.userId = user._id;
//     }
//   } catch (err) {
//     logger.debug("Optional auth failed:", err.message);
//   }
//   next();
// });

// /* ===================== SESSION ===================== */
// export const createSession = async (userId, deviceInfo = {}) => {
//   const sessionId = crypto.randomBytes(16).toString("hex");
//   const key = `session:${userId}:${sessionId}`;

//   await redisClient.setEx(
//     key,
//     24 * 60 * 60,
//     JSON.stringify({ userId, sessionId, deviceInfo })
//   );

//   return sessionId;
// };

// export const invalidateSession = async (userId, sessionId) => {
//   await redisClient.del(`session:${userId}:${sessionId}`);
// };

// export const invalidateAllSessions = async (userId) => {
//   const keys = await redisClient.keys(`session:${userId}:*`);
//   if (keys.length) await redisClient.del(keys);
// };

// /* ===================== TOKEN BLACKLIST ===================== */
// export const blacklistToken = async (token) => {
//   const decoded = jwt.decode(token);
//   const ttl = decoded.exp - Math.floor(Date.now() / 1000);

//   if (ttl > 0) {
//     await redisClient.setEx(`blacklist:${token}`, ttl, "blacklisted");
//   }
// };

// /* ===================== PERMISSIONS ===================== */
// export const userHasPermission = async (userId, permission) => {
//   const cacheKey = `permissions:${userId}`;
//   let permissions = await redisClient.get(cacheKey);

//   if (!permissions) {
//     const user = await User.findById(userId).select("role permissions");

//     const rolePermissions = {
//       user: ["read:own", "update:own"],
//       instructor: ["create:course", "update:course"],
//       admin: ["read:*", "update:*", "delete:*"],
//       superadmin: ["*"],
//     };

//     permissions = [
//       ...(rolePermissions[user.role] || []),
//       ...(user.permissions || []),
//     ];

//     await redisClient.setEx(cacheKey, 3600, JSON.stringify(permissions));
//   } else {
//     permissions = JSON.parse(permissions);
//   }

//   return permissions.includes("*") || permissions.includes(permission);
// };

// /* ===================== ACTIVITY LOG ===================== */
// export const logUserActivity = async (userId, req) => {
//   const activity = {
//     userId,
//     method: req.method,
//     path: req.path,
//     ip: req.ip,
//     userAgent: req.get("User-Agent"),
//     createdAt: new Date(),
//   };

//   const key = `activity:${userId}`;
//   await redisClient.lPush(key, JSON.stringify(activity));
//   await redisClient.lTrim(key, 0, 99);
//   await redisClient.expire(key, 7 * 24 * 60 * 60);

//   Activity.create(activity).catch(err =>
//     logger.error("Failed to store activity:", err)
//   );
// };