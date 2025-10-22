import { useState, useEffect } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";

export interface CommandLogEntry {
  timestamp: Date;
  type: "color" | "animation";
  hexString: string;
  bytes: number[];
  description: string;
}

interface CommandLogProps {
  entries: CommandLogEntry[];
  onClear: () => void;
}

export function CommandLog({ entries, onClear }: CommandLogProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4>AT Command Log</h4>
          <p className="text-muted-foreground">Commands sent to scooter</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={entries.length === 0}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="h-[400px] rounded-lg border p-4">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No commands sent yet
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 border border-border space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={entry.type === "animation" ? "default" : "secondary"}>
                    {entry.type === "animation" ? "Animation" : "Color"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <p className="text-sm">{entry.description}</p>
                
                <div className="space-y-1">
                  <p className="text-muted-foreground">HEX:</p>
                  <code className="block p-2 rounded bg-background/50 text-sm break-all">
                    {entry.hexString}
                  </code>
                </div>
                
                <div className="space-y-1">
                  <p className="text-muted-foreground">Bytes:</p>
                  <code className="block p-2 rounded bg-background/50 text-sm break-all">
                    [{entry.bytes.join(', ')}]
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
