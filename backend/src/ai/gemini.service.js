// src/ai/gemini.service.js
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ GEMINI_API_KEY is missing");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateAIResponse(prompt, options = {}) {
  if (!prompt?.trim()) {
    return "Please provide a valid prompt.";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: options.model || "gemini-2.5-flash",
      systemInstruction: options.systemInstruction,
    });

    const result = await model.generateContent(prompt);

    return typeof result?.response?.text === "function"
      ? result.response.text()
      : result?.response?.text || "";
  } catch (err) {
    console.error("❌ Gemini Error:", err.message);
    throw err;
  }
}
