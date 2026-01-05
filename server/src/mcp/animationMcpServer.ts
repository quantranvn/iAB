#!/usr/bin/env node
/**
 * MCP Animation Server
 * 
 * Provides tools for building LED animation configurations (DesignerConfig).
 * Runs as a stdio-based MCP server, spawned per-request.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// DesignerConfig structure matching frontend types
interface DesignerAnimationProps {
  direction?: "left" | "right";
  mirror?: boolean;
  phaseMs?: number;
  speed?: number;
  color?: string;
  leftColor?: string;
  rightColor?: string;
  [key: string]: unknown;
}

interface DesignerConfigEntry {
  start: number;
  length: number;
  animId: string;
  props?: DesignerAnimationProps;
}

interface DesignerConfig {
  ledCount: number;
  globalBrightness: number;
  globalSpeed: number;
  configs: DesignerConfigEntry[];
}

// Current configuration state (accumulated via tool calls)
let currentConfig: DesignerConfig = {
  ledCount: 16,
  globalBrightness: 1.0,
  globalSpeed: 1.0,
  configs: [],
};

// Create MCP server instance
const server = new McpServer({
  name: "animation-config-server",
  version: "1.0.0",
});

// Tool: Set LED count
server.registerTool(
  "set_led_count",
  {
    description: "Set the total number of LEDs in the strip. Default is 16.",
    inputSchema: {
      count: z.number().int().min(1).max(300).describe("Number of LEDs (1-300)"),
    },
  },
  async ({ count }) => {
    currentConfig.ledCount = count;
    return {
      content: [
        {
          type: "text" as const,
          text: `LED count set to ${count}`,
        },
      ],
    };
  }
);

// Tool: Set global brightness
server.registerTool(
  "set_global_brightness",
  {
    description: "Set the global brightness for all LEDs. Value between 0 and 1.",
    inputSchema: {
      brightness: z.number().min(0).max(1).describe("Brightness value (0.0 to 1.0)"),
    },
  },
  async ({ brightness }) => {
    currentConfig.globalBrightness = brightness;
    return {
      content: [
        {
          type: "text" as const,
          text: `Global brightness set to ${brightness}`,
        },
      ],
    };
  }
);

// Tool: Set global speed
server.registerTool(
  "set_global_speed",
  {
    description: "Set the global speed multiplier for animations. Default is 1.0.",
    inputSchema: {
      speed: z.number().min(0.1).max(10).describe("Speed multiplier (0.1 to 10.0)"),
    },
  },
  async ({ speed }) => {
    currentConfig.globalSpeed = speed;
    return {
      content: [
        {
          type: "text" as const,
          text: `Global speed set to ${speed}`,
        },
      ],
    };
  }
);

// Tool: Add animation configuration segment
server.registerTool(
  "add_animation_config",
  {
    description: `Add an animation configuration for a segment of LEDs. 
Available animation types: solid, police, rainbow, breathing, chase, fire, sparkle, smoothFade.
Props can include: direction ("left"/"right"), mirror (boolean), phaseMs (number), speed (number), 
color (hex string like "#FF0000"), leftColor, rightColor.`,
    inputSchema: {
      start: z.number().int().min(0).describe("Starting LED index (0-based)"),
      length: z.number().int().min(1).describe("Number of LEDs in this segment"),
      animId: z.string().describe("Animation type identifier"),
      props: z
        .object({
          direction: z.enum(["left", "right"]).optional(),
          mirror: z.boolean().optional(),
          phaseMs: z.number().optional(),
          speed: z.number().optional(),
          color: z.string().optional(),
          leftColor: z.string().optional(),
          rightColor: z.string().optional(),
        })
        .passthrough()
        .optional()
        .describe("Animation properties"),
    },
  },
  async ({ start, length, animId, props }) => {
    const entry: DesignerConfigEntry = {
      start,
      length,
      animId,
    };
    if (props) {
      entry.props = props as DesignerAnimationProps;
    }
    currentConfig.configs.push(entry);
    return {
      content: [
        {
          type: "text" as const,
          text: `Added animation "${animId}" at position ${start} with length ${length}`,
        },
      ],
    };
  }
);

// Tool: Get current configuration
server.registerTool(
  "get_current_config",
  {
    description: "Get the current accumulated LED animation configuration as JSON.",
    inputSchema: {},
  },
  async () => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(currentConfig, null, 2),
        },
      ],
    };
  }
);

// Tool: Clear all configurations
server.registerTool(
  "clear_configs",
  {
    description: "Clear all animation configurations and reset to defaults.",
    inputSchema: {},
  },
  async () => {
    currentConfig = {
      ledCount: 16,
      globalBrightness: 1.0,
      globalSpeed: 1.0,
      configs: [],
    };
    return {
      content: [
        {
          type: "text" as const,
          text: "Configuration cleared and reset to defaults",
        },
      ],
    };
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr (safe for stdio MCP servers)
  console.error("Animation MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
