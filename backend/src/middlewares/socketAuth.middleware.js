// socket/auth.middleware.js
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Project } from "../models/project.models.js";
import redisClient from "../services/redis.services.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    console.log("🔌 Socket handshake start:", {
      id: socket.id,
      query: socket.handshake.query,
      auth: socket.handshake.auth,
      address: socket.handshake.address,
    });

    // ---------------- JWT EXTRACTION ----------------
    let token = null;
    const authHeader = socket.handshake.headers?.authorization;

    if (typeof authHeader === "string" && authHeader.trim()) {
      const parts = authHeader.split(" ");
      token = parts.length > 1 ? parts[1] : parts[0];
    } else if (socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }

    if (!token) {
      console.warn("⚠️ No JWT token provided");
      return next(new Error("Authentication Error"));
    }

    // ---------------- JWT VERIFY ----------------
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      console.log("✅ Token decoded:", decoded.id || decoded._id);
    } catch (err) {
      console.error("❌ JWT verification failed:", err.message);
      return next(new Error("Authentication Error"));
    }

    // ---------------- PROJECT HANDLING ----------------
    const projectId =
      socket.handshake.query?.projectId ||
      socket.handshake.auth?.projectId;

    if (!projectId) {
      socket.project = null;
      console.log("ℹ️ No projectId provided");
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      console.warn("⚠️ Invalid projectId:", projectId);
      socket.project = null;
      return next();
    }

    const redisKey = `project:${projectId}`;

    // ---------------- REDIS CACHE CHECK ----------------
    const cachedProject = await redisClient.get(redisKey);

    if (cachedProject) {
      console.log("⚡ Project loaded from Redis cache");
      socket.project = JSON.parse(cachedProject);
      return next();
    }

    // ---------------- DB FALLBACK ----------------
    console.log("🗄️ Project not in Redis, fetching from MongoDB");

    const project = await Project.findById(projectId).lean();

    if (!project) {
      console.warn("⚠️ Project not found in DB:", projectId);
      socket.project = null;
      return next();
    }

    // ---------------- SAVE TO REDIS ----------------
    await redisClient.setex(
      redisKey,
      300, // ⏱️ 5 minutes cache
      JSON.stringify(project)
    );

    console.log("✅ Project cached in Redis");
    socket.project = project;

    next();
  } catch (error) {
    console.error("❌ Socket middleware error:", error);
    next(new Error("Authentication Error"));
  }
};
