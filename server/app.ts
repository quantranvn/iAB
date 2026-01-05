import express, { type Application } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { generateAnimationWithMcp } from "./src/services/mcpClientService.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(process.env.GOOGLE_GENAI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// GET /get_animation_config - Returns LED animation config from data_led.json
app.get("/get_animation_config", (_req, res) => {
  try {
    const dataPath = path.join(__dirname, "data", "data_led.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const config = JSON.parse(rawData);

    res.json({
      success: true,
      config,
      source: "server",
    });
  } catch (error) {
    console.error("Failed to read data_led.json:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load animation config from server.",
    });
  }
});

// POST /ai_generation - Generate LED animation config using MCP + Gemini AI
app.post("/ai_generation", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({
        success: false,
        error: "Please provide a prompt describing the animation you want to create.",
      });
      return;
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        success: false,
        error: "AI service is not configured. Please set GOOGLE_GENAI_API_KEY in the server .env file.",
      });
      return;
    }

    console.log(`[AI Generation] Processing prompt: "${prompt.trim()}"`);

    const result = await generateAnimationWithMcp(prompt.trim(), apiKey);

    if (result.success) {
      console.log("[AI Generation] Successfully generated config");
      res.json(result);
    } else {
      console.error("[AI Generation] Failed:", result.error);
      res.status(422).json(result);
    }
  } catch (error) {
    console.error("[AI Generation] Unexpected error:", error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please check server logs and try again.",
    });
  }
});

export default app;
