import ApiError from "../../common/utils/api-error.js";
import { verifyAccessToken } from "../../common/utils/jwt.utils.js";
import User from "./auth.model.js";

// Authenticates using the short-lived access token (header or cookie)
const authenticate = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) throw ApiError.unauthorized("Not authenticated");

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (!user) throw ApiError.unauthorized("User no longer exists");

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Session expired. Please refresh or sign in again.");
    }

    if (err.name === "JsonWebTokenError") {
      throw ApiError.unauthorized("Invalid session. Please sign in again.");
    }

    throw err;
  }
};

const optionalAuthenticate = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);

    if (user) {
      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
      };
    }
  } catch {
    req.user = undefined;
  }

  next();
};

export { authenticate, optionalAuthenticate };
