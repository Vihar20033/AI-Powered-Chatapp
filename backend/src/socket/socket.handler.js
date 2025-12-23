// src/socket/socketHandler.js
import mongoose from "mongoose";
import crypto from "crypto";
import redisClient from "../services/redis.services.js";
import { generateAIResponse } from "../ai/gemini.service.js";

/* ================= CONFIG ================= */
const MESSAGE_LIMIT = 100;
const AI_TTL_SECONDS = 60 * 60; // 1 hour
const AI_LOCK_TTL = 15; // seconds (prevent duplicate AI calls)

/* ================= REDIS HELPERS ================= */

// Hash prompt → stable redis key
function getPromptKey(prompt) {
  const hash = crypto
    .createHash("sha256")
    .update(prompt.toLowerCase())
    .digest("hex");

  return `ai:prompt:${hash}`;
}

// Lock key to avoid duplicate AI calls
function getLockKey(prompt) {
  return `ai:lock:${getPromptKey(prompt)}`;
}

// Read cached AI response
async function getAIFromCache(prompt) {
  return redisClient.get(getPromptKey(prompt));
}

// Save AI response with TTL
async function saveAIToCache(prompt, response) {
  await redisClient.set(getPromptKey(prompt), response, {
    EX: AI_TTL_SECONDS,
  });
}

// Acquire distributed lock (SET NX EX)
async function acquireLock(prompt) {
  return redisClient.set(getLockKey(prompt), "1", {
    NX: true,
    EX: AI_LOCK_TTL,
  });
}

// Release lock
async function releaseLock(prompt) {
  await redisClient.del(getLockKey(prompt));
}

/* ================= SOCKET HANDLER ================= */

export function socketHandler(io) {
  io.on("connection", (socket) => {
    const userId = socket.user?.id;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log("✅ Connected:", socket.id);

    /* ---------- JOIN PROJECT ---------- */
    socket.on("join-project", async ({ projectId }) => {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return;

      socket.join(projectId);

      const cachedMessages = await redisClient.lrange(
        `messages:${projectId}`,
        0,
        49
      );

      const messages = cachedMessages
        .map((m) => JSON.parse(m))
        .reverse();

      socket.emit("load-messages", messages);
    });

    /* ---------- PROJECT MESSAGE ---------- */
    socket.on("project-message", async ({ projectId, message }) => {
      if (!projectId || !message?.trim()) return;

      const userMsg = {
        id: `${userId}-${Date.now()}`,
        projectId,
        message,
        senderId: userId,
        senderName: socket.user.email,
        timestamp: new Date().toISOString(),
      };

      await redisClient.lpush(
        `messages:${projectId}`,
        JSON.stringify(userMsg)
      );
      await redisClient.ltrim(
        `messages:${projectId}`,
        0,
        MESSAGE_LIMIT - 1
      );

      socket.to(projectId).emit("project-message", userMsg);

      /* ---------- AI TRIGGER ---------- */
      if (!message.toLowerCase().includes("@ai")) return;

      const prompt = message.replace(/@ai/gi, "").trim();
      if (!prompt) return;

      socket.emit("ai-typing", { projectId });

      try {
        /* ===== 1️⃣ CACHE CHECK ===== */
        let aiText = await getAIFromCache(prompt);

        if (!aiText) {
          /* ===== 2️⃣ LOCK CHECK ===== */
          const lockAcquired = await acquireLock(prompt);

          if (!lockAcquired) {
            // Another request is generating the same AI response
            return;
          }

          try {
            /* ===== 3️⃣ CALL GEMINI ===== */
            aiText = await generateAIResponse(prompt);

            /* ===== 4️⃣ SAVE TO CACHE ===== */
            await saveAIToCache(prompt, aiText);
          } finally {
            await releaseLock(prompt);
          }
        }

        const aiMsg = {
          id: `ai-${Date.now()}`,
          projectId,
          message: aiText,
          senderId: "ai",
          senderName: "AI Assistant",
          timestamp: new Date().toISOString(),
        };

        await redisClient.lpush(
          `messages:${projectId}`,
          JSON.stringify(aiMsg)
        );
        await redisClient.ltrim(
          `messages:${projectId}`,
          0,
          MESSAGE_LIMIT - 1
        );

        io.to(projectId).emit("project-message", aiMsg);
        io.to(projectId).emit("ai-done", { projectId });
      } catch (err) {
        console.error("❌ AI Error:", err.message);
        socket.emit("ai-done", { projectId });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
    });
  });
}
