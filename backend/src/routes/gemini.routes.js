import { Router } from "express";
import { getResult } from "../controllers/ai.controller.js";

console.log("✅ AI Routes Loaded");

const router = Router();

router.get("/get-result", getResult);

export default router;
