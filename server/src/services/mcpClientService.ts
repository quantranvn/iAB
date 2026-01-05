/**
 * MCP Client Service
 * 
 * Connects to the Animation MCP Server via stdio and orchestrates
 * tool calls based on Google Gemini AI responses.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DesignerConfig interface (matches frontend types)
interface DesignerConfig {
  ledCount: number;
  globalBrightness: number;
  globalSpeed: number;
  configs: Array<{
    start: number;
    length: number;
    animId: string;
    props?: Record<string, unknown>;
  }>;
}

interface GenerationResult {
  success: boolean;
  config?: DesignerConfig;
  error?: string;
  source?: "ai";
}

// Tool definitions for Gemini function calling (using string literals for schema types)
const GEMINI_TOOLS = [
  {
    name: "set_led_count",
    description: "Set the total number of LEDs in the strip. Default is 16.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        count: {
          type: "NUMBER" as const,
          description: "Number of LEDs (1-16)",
        },
      },
      required: ["count"],
    },
  },
  {
    name: "set_global_brightness",
    description: "Set the global brightness for all LEDs. Value between 0 and 1.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        brightness: {
          type: "NUMBER" as const,
          description: "Brightness value (0.0 to 1.0)",
        },
      },
      required: ["brightness"],
    },
  },
  {
    name: "set_global_speed",
    description: "Set the global speed multiplier for animations. Default is 1.0.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        speed: {
          type: "NUMBER" as const,
          description: "Speed multiplier (0.1 to 10.0)",
        },
      },
      required: ["speed"],
    },
  },
  {
    name: "add_animation_config",
    description: `Add an animation configuration for a segment of LEDs. 
Available animation types: solid, police, rainbow, breathing, chase, fire, sparkle, smoothFade.
Props can include: direction ("left"/"right"), mirror (boolean), phaseMs (number), speed (number), 
color (hex string like "#FF0000"), leftColor, rightColor.`,
    parameters: {
      type: "OBJECT" as const,
      properties: {
        start: {
          type: "NUMBER" as const,
          description: "Starting LED index (0-based)",
        },
        length: {
          type: "NUMBER" as const,
          description: "Number of LEDs in this segment",
        },
        animId: {
          type: "STRING" as const,
          description: "Animation type identifier",
        },
        props: {
          type: "OBJECT" as const,
          description: "Animation properties (direction, mirror, phaseMs, speed, color, leftColor, rightColor)",
          properties: {
            direction: { type: "STRING" as const },
            mirror: { type: "BOOLEAN" as const },
            phaseMs: { type: "NUMBER" as const },
            speed: { type: "NUMBER" as const },
            color: { type: "STRING" as const },
            leftColor: { type: "STRING" as const },
            rightColor: { type: "STRING" as const },
          },
        },
      },
      required: ["start", "length", "animId"],
    },
  },
  {
    name: "get_current_config",
    description: "Get the current accumulated LED animation configuration as JSON. Call this after setting up all animations.",
    parameters: {
      type: "OBJECT" as const,
      properties: {},
    },
  },
  {
    name: "clear_configs",
    description: "Clear all animation configurations and reset to defaults.",
    parameters: {
      type: "OBJECT" as const,
      properties: {},
    },
  },
];

const SYSTEM_INSTRUCTION = `You are an LED animation configuration assistant. Your task is to create LED strip animation configurations based on user descriptions.

Available tools:
- set_led_count: Set total LED count (default 16)
- set_global_brightness: Set brightness 0-1 (default 1.0)
- set_global_speed: Set speed multiplier (default 1.0)
- add_animation_config: Add animation segment with start position, length, animation type, and optional props
- get_current_config: Retrieve final configuration JSON
- clear_configs: Reset configuration

Available animation types:
- solid: Static color (use "color" prop)
- police: Alternating red/blue police lights (use "leftColor", "rightColor" props)
- rainbow: Cycling rainbow colors
- breathing: Pulsing brightness effect (use "color" prop)
- chase: Moving light pattern (use "color", "direction" props)
- fire: Flickering fire effect
- sparkle: Random twinkling lights (use "color" prop)
- smoothFade: Smooth color transition

Workflow:
1. First call clear_configs to start fresh
2. Optionally set led_count, global_brightness, global_speed
3. Add one or more animation configs using add_animation_config
4. Finally call get_current_config to return the complete configuration

Important:
- Segments can overlap for layered effects
- Use hex color strings like "#FF0000" for red, "#00FF00" for green, "#0000FF" for blue
- Adjust speed prop for individual animations (lower = slower)
- Be creative with color combinations for abstract prompts like "sunset" or "ocean"
- Always end by calling get_current_config`;

/**
 * Generate LED animation configuration using MCP server and Gemini AI
 */
export async function generateAnimationWithMcp(
  prompt: string,
  apiKey: string
): Promise<GenerationResult> {
  let mcpClient: Client | null = null;
  let transport: StdioClientTransport | null = null;

  try {
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Path to MCP server script
    const mcpServerPath = path.join(__dirname, "..", "mcp", "animationMcpServer.ts");

    // Spawn MCP server as child process
    transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", mcpServerPath],
      stderr: "pipe",
    });

    // Create MCP client and connect
    mcpClient = new Client({
      name: "animation-generator-client",
      version: "1.0.0",
    });

    await mcpClient.connect(transport);

    // List available tools from MCP server
    const toolsResult = await mcpClient.listTools();
    console.error(`Connected to MCP server with ${toolsResult.tools.length} tools`);

    // Start chat with Gemini
    const chat = model.startChat({
      tools: [{ functionDeclarations: GEMINI_TOOLS }],
    });

    // Send user prompt
    let response = await chat.sendMessage(
      `Create an LED animation configuration for: "${prompt}"`
    );

    let finalConfig: DesignerConfig | null = null;
    const maxIterations = 20; // Prevent infinite loops
    let iterations = 0;

    // Process function calls until completion
    while (iterations < maxIterations) {
      iterations++;
      const candidate = response.response.candidates?.[0];
      const content = candidate?.content;

      if (!content || !content.parts) {
        break;
      }

      // Check for function calls
      const functionCalls = content.parts.filter((part) => part.functionCall);

      if (functionCalls.length === 0) {
        // No more function calls, check for text response
        const textPart = content.parts.find((part) => part.text);
        if (textPart?.text) {
          console.error("Gemini response:", textPart.text);
        }
        break;
      }

      // Execute each function call via MCP
      const functionResponses: Array<{
        functionResponse: {
          name: string;
          response: { result: string };
        };
      }> = [];

      for (const part of functionCalls) {
        const fc = part.functionCall!;
        console.error(`Calling MCP tool: ${fc.name}`, fc.args);

        try {
          const result = await mcpClient.callTool({
            name: fc.name,
            arguments: fc.args as Record<string, unknown>,
          });

          // Extract text content from result
          const resultText =
            result.content && Array.isArray(result.content)
              ? result.content
                  .filter((c): c is { type: "text"; text: string } => c.type === "text")
                  .map((c) => c.text)
                  .join("\n")
              : String(result.content);

          console.error(`Tool ${fc.name} result:`, resultText);

          // If this is get_current_config, parse the result
          if (fc.name === "get_current_config") {
            try {
              finalConfig = JSON.parse(resultText);
            } catch (parseErr) {
              console.error("Failed to parse config:", parseErr);
            }
          }

          functionResponses.push({
            functionResponse: {
              name: fc.name,
              response: { result: resultText },
            },
          });
        } catch (toolError) {
          console.error(`Tool ${fc.name} error:`, toolError);
          functionResponses.push({
            functionResponse: {
              name: fc.name,
              response: {
                result: `Error: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
              },
            },
          });
        }
      }

      // Send function responses back to Gemini
      response = await chat.sendMessage(functionResponses);
    }

    // Close MCP connection
    await mcpClient.close();

    if (finalConfig) {
      return {
        success: true,
        config: finalConfig,
        source: "ai",
      };
    } else {
      return {
        success: false,
        error:
          "Failed to generate animation configuration. The AI did not return a valid config. Try rephrasing your prompt with more specific details like colors, animation types, or effects.",
      };
    }
  } catch (error) {
    console.error("MCP client error:", error);

    // Clean up on error
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch {
        // Ignore cleanup errors
      }
    }

    // Provide descriptive error messages
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      console.error("Error message:", error.message);
      
      if (errorMsg.includes("api_key") || errorMsg.includes("api key") || errorMsg.includes("invalid key")) {
        return {
          success: false,
          error: "Invalid or missing Gemini API key. Please check your server configuration.",
        };
      }
      if (errorMsg.includes("quota") || errorMsg.includes("rate_limit") || errorMsg.includes("resource_exhausted")) {
        return {
          success: false,
          error: "API rate limit exceeded. Please wait a moment and try again.",
        };
      }
      if (errorMsg.includes("enoent") || errorMsg.includes("spawn")) {
        return {
          success: false,
          error: "Failed to start MCP server. Ensure 'npx' and 'tsx' are available.",
        };
      }
      return {
        success: false,
        error: `AI generation failed: ${error.message}. Try a simpler prompt or check server logs.`,
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred during animation generation. Please try again.",
    };
  }
}
