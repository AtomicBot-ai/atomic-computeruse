export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image"; data: string; mimeType: string };
export type ToolResult = {
  content: Array<TextContent | ImageContent>;
  details: Record<string, unknown>;
};

export function abortedResult(): ToolResult {
  return { content: [{ type: "text", text: "Aborted" }], details: { status: "aborted" } };
}

export type OverlayConfig = {
  enabled: boolean;
  color: string;
  label: string;
};

export type ComputerToolOptions = {
  debugArtifacts?: boolean;
  debugArtifactsDir?: string;
  lockDir?: string;
  overlay?: Partial<OverlayConfig>;
};

export type ComputerTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  execute: (toolCallId: string, args: Record<string, unknown>, signal?: AbortSignal) => Promise<ToolResult>;
};
