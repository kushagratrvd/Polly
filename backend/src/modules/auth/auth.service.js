import crypto from "crypto";
import User from "./auth.model.js";
import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateResetToken,
} from "../../common/utils/jwt.utils.js";
import {
  sendResetPasswordEmail,
} from "../../common/config/email.js";

// Hash refresh token before storing — same approach as reset tokens
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("Email already registered");

  const { rawToken, hashedToken } = generateResetToken();

  const user = await User.create({
    name,
    email,
    password,
    verificationToken: hashedToken,
  });

  const accessToken = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  const hashedRefreshToken = hashToken(refreshToken);
  user.refreshToken = hashedRefreshToken;
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.verificationToken;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized("Invalid email or password");

  const accessToken = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};

const refresh = async (token) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");

  const decoded = verifyRefreshToken(token);

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user) throw ApiError.unauthorized("User no longer exists");

  if (user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized("Invalid refresh token — please log in again");
  }

  const accessToken = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });
  user.refreshToken = hashToken(refreshToken);

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound("No account with that email");

  const { rawToken, hashedToken } = generateResetToken();

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  try {
    await sendResetPasswordEmail(email, rawToken);
  } catch (err) {
    console.error("Failed to send reset email:", err.message);
  }
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) throw ApiError.badRequest("Invalid or expired reset token");

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user;
};

export {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
