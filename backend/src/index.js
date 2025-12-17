import dotenv from "dotenv";
import connectDB from "./db/connectDB.js";
import { app } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { socketAuthMiddleware } from "./middlewares/socketAuth.middleware.js";
import redisClient from "./services/redis.services.js";

dotenv.config({ path: "./.env" });

/* ===================== AI SETUP ===================== */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function generateResult(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const response = result?.response;
  return typeof response?.text === "function" ? response.text() : response?.text;
}

/* ===================== SERVER SETUP ===================== */
const PORT = process.env.PORT || 8000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  allowEIO3: true,
});

// 🔐 Socket Authentication Middleware
io.use(socketAuthMiddleware);

/* ===================== SOCKET CONNECTION ===================== */
io.on("connection", async (socket) => {
  console.log(
    "✅ User connected:",
    socket.id,
    "| User:",
    socket.user?.email || socket.user?.id
  );

  /* ---------- Track Online Users ---------- */
  await redisClient.sadd("online-users", socket.user.id);

  /* ---------- Auto Join Project Room ---------- */
  if (socket.project?._id) {
    const roomId = socket.project._id.toString();
    socket.join(roomId);
    console.log(`🔒 Joined project room: ${roomId}`);
  }

  /* ===================== JOIN PROJECT ===================== */
  socket.on("join-project", async ({ projectId }) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return socket.emit("joined-project", {
        success: false,
        error: "Invalid projectId",
      });
    }

    socket.join(projectId);

    // ⚡ Load messages from Redis
    const cachedMessages = await redisClient.lrange(
      `messages:${projectId}`,
      0,
      49
    );

    const messages = cachedMessages
      .map((m) => JSON.parse(m))
      .reverse();

    socket.emit("load-messages", messages);

    const roomSize = io.sockets.adapter.rooms.get(projectId)?.size || 0;
    socket.emit("joined-project", { success: true, projectId, roomSize });
  });

  /* ===================== LEAVE PROJECT ===================== */
  socket.on("leave-project", ({ projectId }) => {
    socket.leave(projectId);
    console.log(`👋 Left room: ${projectId}`);
  });

  /* ===================== PROJECT MESSAGE ===================== */
  socket.on("project-message", async ({ projectId, message }) => {
    try {
      if (!projectId || !message) return;

      if (!io.sockets.adapter.rooms.get(projectId)?.has(socket.id)) {
        socket.join(projectId);
      }

      const msgData = {
        id: `${socket.user.id}-${Date.now()}`,
        projectId,
        message,
        senderId: socket.user.id,
        senderName: socket.user.email || "User",
        timestamp: new Date().toISOString(),
      };

      // ⚡ Save message to Redis
      await redisClient.lpush(
        `messages:${projectId}`,
        JSON.stringify(msgData)
      );
      await redisClient.ltrim(`messages:${projectId}`, 0, 99);

      // 📢 Emit message
      io.to(projectId).emit("project-message", msgData);

      /* ---------- AI MESSAGE ---------- */
      if (!message.toLowerCase().includes("@ai")) return;

      const prompt = message.replace(/@ai/gi, "").trim();
      if (!prompt) return;

      const aiResult = await generateResult(prompt);

      const aiMsg = {
        id: `ai-${Date.now()}`,
        projectId,
        message: aiResult,
        senderId: "ai",
        senderName: "AI Assistant",
        timestamp: new Date().toISOString(),
      };

      await redisClient.lpush(
        `messages:${projectId}`,
        JSON.stringify(aiMsg)
      );
      await redisClient.ltrim(`messages:${projectId}`, 0, 99);

      io.to(projectId).emit("project-message", aiMsg);
    } catch (err) {
      console.error("❌ project-message error:", err);
    }
  });

  /* ===================== PRIVATE MESSAGE ===================== */
  socket.on("private-message", (data) => {
    const { receiverId } = data;

    for (const [id, sock] of io.sockets.sockets) {
      const uid = sock.user?.id ?? sock.user?._id;
      if (String(uid) === String(receiverId)) {
        io.to(id).emit("private-message", data);
        socket.emit("private-message", data);
        break;
      }
    }
  });

  /* ===================== DISCONNECT ===================== */
  socket.on("disconnect", async (reason) => {
    console.log("❌ Disconnected:", socket.id, "| Reason:", reason);
    await redisClient.srem("online-users", socket.user.id);
  });

  socket.on("error", (err) => {
    console.error("⚠️ Socket error:", err);
  });
});

/* ===================== START SERVER ===================== */
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Socket endpoint: ws://localhost:${PORT}`);
});

connectDB()
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("🔥 MongoDB error:", err));
