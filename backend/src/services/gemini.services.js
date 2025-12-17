import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("✅ Gemini service loaded");

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateResult = async (prompt) => {
  console.log("🚀 generateResult() called with prompt:", prompt);

  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash" ,
    systemInstruction:`You are an expert in MERN and Development. You have an experience of 10 years in the development. 
    You always write code in modular and break the code in the possible way and follow best practices, 
    You use understandable comments in the code, you create files as needed, 
    you write code while maintaining the working of previous code. 
    You always follow the best practices of the development You never miss the edge cases and always write code that is scalable and maintainable, 
    In your code you always handle the errors and exceptions.`
  });
  const result = await model.generateContent(prompt);

  console.log("✅ Gemini response received");

  return result.response.text();
};
