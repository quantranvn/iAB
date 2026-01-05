import type { DesignerConfig } from "../types/designer";

const AI_SERVER_URL = "http://localhost:3002";

export interface AIGenerationResult {
  success: boolean;
  config?: DesignerConfig;
  error?: string;
  source?: "ai" | "mock";
}

export interface AIServerHealth {
  status: "ok" | "error";
  aiConfigured: boolean;
  timestamp: string;
}

/**
 * Check if the AI server is running and healthy
 */
export const checkAIServerHealth = async (): Promise<AIServerHealth | null> => {
  try {
    const response = await fetch(`${AI_SERVER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn("AI server health check failed:", error);
    return null;
  }
};

/**
 * Generate an LED animation configuration from a natural language prompt
 */
export const generateAIAnimation = async (
  prompt: string
): Promise<AIGenerationResult> => {
  if (!prompt.trim()) {
    return {
      success: false,
      error: "Please enter a description for your animation.",
    };
  }

  try {
    const response = await fetch(`${AI_SERVER_URL}/ai_generation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: prompt.trim() }),
      signal: AbortSignal.timeout(60000), // 60 second timeout for AI generation
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 422) {
        return {
          success: false,
          error: errorData.error || "AI returned an invalid animation. Try a different prompt.",
        };
      }

      return {
        success: false,
        error: errorData.error || `Server error (${response.status})`,
      };
    }

    const result = await response.json();

    if (!result.success || !result.config) {
      return {
        success: false,
        error: result.error || "Failed to generate animation.",
      };
    }

    return {
      success: true,
      config: result.config as DesignerConfig,
      source: result.source,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        return {
          success: false,
          error: "Request timed out. The AI server may be busy.",
        };
      }

      if (error.message.includes("fetch") || error.message.includes("network")) {
        return {
          success: false,
          error: "Cannot connect to AI server. Make sure it's running with: cd server && npm run dev",
        };
      }
    }

    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
};

/**
 * Example prompts to show users what they can ask for
 */
export const AI_PROMPT_EXAMPLES = [
  "Police lights with red and blue",
  "Rainbow effect across all LEDs",
  "Slow breathing purple glow",
  "Fire effect on first 8 LEDs",
  "Chase animation in green",
  "Split: left half red, right half blue",
  "Sparkle effect like stars",
  "Warm sunset colors, slow fade",
];

/**
 * Get a random example prompt
 */
export const getRandomPromptExample = (): string => {
  return AI_PROMPT_EXAMPLES[Math.floor(Math.random() * AI_PROMPT_EXAMPLES.length)];
};

/**
 * Fetch LED animation configuration from the server
 * This reads data_led.json from the server for testing purposes
 */
export const fetchServerConfig = async (): Promise<AIGenerationResult> => {
  try {
    const response = await fetch(`${AI_SERVER_URL}/get_animation_config`, {
      method: "GET",
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Server error (${response.status})`,
      };
    }

    const result = await response.json();

    if (!result.success || !result.config) {
      return {
        success: false,
        error: result.error || "Failed to fetch animation config.",
      };
    }

    return {
      success: true,
      config: result.config,
      source: result.source,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        return {
          success: false,
          error: "Request timed out. The server may be busy.",
        };
      }

      if (error.message.includes("fetch") || error.message.includes("network")) {
        return {
          success: false,
          error: "Cannot connect to server. Make sure it's running with: cd server && npm run dev",
        };
      }
    }

    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
};
