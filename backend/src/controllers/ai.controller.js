import * as ai from "../services/prompt.services.js";

export const getResult = async (req, res) => {
  console.log("🎯 getResult hit. Body received:", req.body);

  try {

    const { prompt } = req.body;
    console.log("📩 Extracted prompt:", prompt);

    const result = await ai.generateResult(prompt);

    console.log("✅ Sending response to client");
    res.json({ result });
    
  } catch (error) {
    console.error("❌ AI error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
