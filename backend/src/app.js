import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import ApiError from "./common/utils/api-error.js";
import authRoute from "./modules/auth/auth.routes.js";
import pollRoute from "./modules/poll/poll.routes.js";

const app = express();
let clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
// allow comma-separated list in CLIENT_URL env
if (typeof clientOrigin === "string" && clientOrigin.includes(",")) {
  clientOrigin = clientOrigin.split(",").map((s) => s.trim()).filter(Boolean);
}
app.use(
  cors({
    origin: Array.isArray(clientOrigin) ? clientOrigin : [clientOrigin],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/poll", pollRoute);

// Catch-all for undefined routes
app.all("{*path}", (req, res) => {
  throw ApiError.notFound(`Route ${req.originalUrl} not found`);
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message =
    err.isOperational && err.message
      ? err.message
      : "Something went wrong. Please try again.";

  if (process.env.NODE_ENV !== "production" && !err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
});

export default app;
