import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Animation config endpoint: GET /get_animation_config`);
  console.log(`🤖 AI generation endpoint: POST /ai_generation`);
  console.log(`❤️  Health check: GET /health`);
});
