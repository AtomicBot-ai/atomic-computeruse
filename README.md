# @atomicbot/computer-use

**Framework-agnostic desktop automation for AI agents.**

Give your AI agent eyes and hands — screenshot the screen, click, type, scroll, drag, read text via OCR, and more. Works with any tool-calling LLM framework, MCP server, or custom pipeline.

[![npm](https://img.shields.io/npm/v/@atomicbot/computer-use)](https://www.npmjs.com/package/@atomicbot/computer-use)
[![license](https://img.shields.io/npm/l/@atomicbot/computer-use)](./LICENSE)
![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

---

## Features

| | Feature | Description |
|---|---|---|
| 📸 | **Screenshot** | Capture any display with automatic downscaling and grid overlay |
| 📸 | **Screenshot Full** | Full-resolution capture with OCR text anchors |
| 🖱️ | **Click / Double / Triple** | Precise clicking with coordinate mapping from screenshot space |
| ⌨️ | **Type & Press** | Text input and keyboard shortcuts (modifiers, combos) |
| 📜 | **Scroll** | Directional scrolling at any position |
| 🔍 | **OCR** | Built-in text recognition (macOS Vision, Windows Media OCR) |
| 🎯 | **Coord Mapping** | Automatic screenshot → screen coordinate translation |
| 🛡️ | **Guardrails** | Prevents misclicks in dock/launcher and submit zones |
| 🔒 | **Session Lock** | File-based lock prevents concurrent agent sessions |
| 🟢 | **Overlay** | Native "agent active" indicator (macOS Swift, Windows PowerShell) |
| 🐛 | **Debug Artifacts** | Save screenshots, OCR results, and tool outputs per action |
| 📋 | **Clipboard** | Read/write clipboard contents |
| 🚀 | **Open App** | Launch or switch apps by name (cross-platform) |
| ↔️ | **Drag & Drop** | Native drag support via platform scripts |

## Quick Start

```bash
npm install @atomicbot/computer-use
```

```typescript
import { createComputerTool } from "@atomicbot/computer-use";

const tool = createComputerTool({
  overlay: { enabled: true, color: "AEFF00", label: "My Agent" },
  debugArtifacts: true,
});

// Take a screenshot
const screenshot = await tool.execute("call-1", { action: "screenshot" });

// Click at coordinates from the screenshot
await tool.execute("call-2", { action: "click", x: 512, y: 384 });

// Type text
await tool.execute("call-3", { action: "type", text: "Hello, world!" });

// Press a keyboard shortcut
await tool.execute("call-4", { action: "press", text: "cmd+s" });
```

### Use with any LLM tool-calling framework

The returned `tool` object has a standard shape that plugs into any agent loop:

```typescript
const tool = createComputerTool();

// tool.name        → "computer"
// tool.description → detailed prompt for the model
// tool.schema      → JSON Schema (TypeBox) for tool parameters
// tool.execute     → (toolCallId, args, signal?) => Promise<ToolResult>
```

## Supported Actions

| Action | Parameters | Description |
|--------|-----------|-------------|
| `screenshot` | `display_index?` | Capture screen (auto-downscaled with grid overlay) |
| `screenshot_full` | `display_index?` | Full-resolution capture + OCR text anchors |
| `click` | `x`, `y`, `button?` | Single click at coordinates |
| `double_click` | `x`, `y`, `button?` | Double click |
| `triple_click` | `x`, `y`, `button?` | Triple click (select line) |
| `type` | `text` | Type literal text as-is |
| `press` | `text` | Keyboard shortcut (`cmd+v`, `enter`, `tab`) |
| `submit_input` | — | Press Enter to submit current input |
| `scroll` | `x?`, `y?`, `direction`, `amount?` | Scroll in any direction |
| `cursor_position` | — | Get current cursor position |
| `mouse_move` | `x`, `y` | Move cursor to position |
| `drag` | `x`, `y`, `to_x`, `to_y` | Drag from one point to another |
| `wait` | `duration?` | Pause execution (max 30s) |
| `hold_key` | `text`, `duration?` | Hold a key combo (max 10s) |
| `display_list` | — | List connected displays |
| `read_clipboard` | — | Read clipboard contents |
| `write_clipboard` | `text` | Write text to clipboard |
| `open_app` | `app_name` | Launch application by name |
| `switch_app` | `app_name` | Switch to application by name |

## Configuration

```typescript
type ComputerToolOptions = {
  overlay?: {
    enabled?: boolean;  // Show "agent active" overlay (default: true)
    color?: string;     // Hex color without # (default: "AEFF00")
    label?: string;     // Overlay label (default: "Atomic bot")
  };
  debugArtifacts?: boolean;    // Save debug output per action
  debugArtifactsDir?: string;  // Custom debug output directory
  lockDir?: string;            // Custom session lock directory
};
```

## Advanced: Subpath Imports

The library exposes its internal subsystems as separate entry points for advanced use cases.

### Individual Actions

```typescript
import { executeScreenshot, executeClick, executeType } from "@atomicbot/computer-use/actions";

// Build a custom tool with only the actions you need
const result = await executeScreenshot({
  displayIndex: 0,
  captureSource: "screenshot_full",
  disableDownscale: true,
});
```

### OCR (Standalone)

```typescript
import {
  recognizeText,
  buildOcrLayout,
  summarizeOcr,
  createOcrAdapter,
} from "@atomicbot/computer-use/ocr";
import type { OcrResult, OcrAdapter } from "@atomicbot/computer-use/ocr";

const ocrResult = await recognizeText({
  imagePath: "./screenshot.png",
  imageWidth: 1920,
  imageHeight: 1080,
});

const layout = buildOcrLayout(ocrResult);
const summary = summarizeOcr(ocrResult);
```

### Overlay

```typescript
import {
  configureOverlay,
  showOverlay,
  forceHideOverlay,
} from "@atomicbot/computer-use/overlay";

configureOverlay({ enabled: true, color: "FF5500", label: "My Bot" });
await showOverlay();
// ... do work ...
await forceHideOverlay();
```

### Session Lock

```typescript
import {
  configureLockDir,
  tryAcquire,
  releaseLock,
  isLockHeldLocally,
} from "@atomicbot/computer-use/session-lock";

const result = await tryAcquire("my-session-id");
if (result.kind === "blocked") {
  console.log(`Blocked by session: ${result.by}`);
} else {
  // ... do work ...
  await releaseLock();
}
```

### Coordinate Mapping

```typescript
import { mapToScreen, storeCoordMap } from "@atomicbot/computer-use/coord-mapping";

// Store the coord map string from a screenshot result
storeCoordMap("0,0,1920,1080,1024,768");

// Map screenshot coordinates to screen points
const screenPoint = mapToScreen(512, 384);
// → { x: 960, y: 540 }
```

## Platform Support

| Feature | macOS | Windows | Linux |
|---------|:-----:|:-------:|:-----:|
| Screenshot | ✅ | ✅ | ✅ |
| Click / Type / Press | ✅ | ✅ | ✅ |
| Scroll | ✅ | ✅ | ✅ |
| OCR | ✅ Vision | ✅ Media OCR | — |
| Overlay | ✅ Swift | ✅ PowerShell | — |
| Drag (native) | ✅ Swift | ✅ PowerShell | ✅ fallback |
| Click animation | ✅ Swift | ✅ PowerShell | — |
| Clipboard | ✅ pbcopy | ✅ PowerShell | ✅ xclip |

## Architecture

```
┌─────────────────────────────────────────────────┐
│              createComputerTool()                │
│  ┌───────────────────────────────────────────┐   │
│  │            Action Router                  │   │
│  │  screenshot · click · type · press · ...  │   │
│  └──────────────┬────────────────────────────┘   │
│     ┌───────────┼───────────────┐                │
│     ▼           ▼               ▼                │
│  ┌──────┐  ┌─────────┐  ┌────────────┐          │
│  │ OCR  │  │ Overlay  │  │ Guardrails │          │
│  └──┬───┘  └────┬────┘  └────────────┘          │
│     │           │                                │
│  ┌──┴───────────┴──────────────────────┐         │
│  │    usecomputer (native bridge)      │         │
│  └──┬──────────┬───────────────┬───────┘         │
│     ▼          ▼               ▼                 │
│  macOS      Windows          Linux               │
│  (Swift)    (PowerShell)     (X11/xdotool)       │
└─────────────────────────────────────────────────┘
```

## License

MIT
