# @atomicbotai/computer-use

**Framework-agnostic desktop automation for AI agents.**

Give your AI agent eyes and hands — screenshot the screen, click, type, scroll, drag, read text via OCR, and more. Works with any tool-calling LLM framework, MCP server, or custom pipeline.

[![npm](https://img.shields.io/npm/v/@atomicbotai/computer-use)](https://www.npmjs.com/package/@atomicbotai/computer-use)
[![license](https://img.shields.io/npm/l/@atomicbotai/computer-use)](./LICENSE)
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
npm install @atomicbotai/computer-use
```

```typescript
import { createComputerTool } from "@atomicbotai/computer-use";

const tool = createComputerTool({
  overlay: { enabled: true, color: "00BFFF", label: "My Agent" },
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

## OCR: Built-in Text Recognition

One of the most powerful features of the library — **zero-dependency OCR** that uses native platform APIs. No Tesseract, no cloud services, no API keys, no extra binaries. It just works.

### Why This Matters for AI Agents

Screenshots alone are not enough. When an LLM looks at a downscaled screenshot, small text becomes unreadable — button labels, menu items, chat messages, form fields all blur together. The agent guesses coordinates and misses.

OCR solves this by extracting text with **pixel-precise coordinates** directly from the screenshot. The agent gets:

- **Anchor points** — `"Send" at (1450, 890)` — exact clickable coordinates for every text element
- **Bounding boxes** — `left=1400, top=875, width=100, height=30` — the full region of each element
- **Confidence scores** — so the agent knows which detections to trust
- **Layout structure** — elements ordered top-to-bottom, left-to-right, matching how a human reads the screen

This turns a blurry screenshot into a structured map of the UI.

### How It Works

When you call `screenshot_full`, the library:

1. Takes a **full-resolution** screenshot (no downscaling)
2. Runs OCR via the **native platform engine** (no external deps)
3. Selects the most useful text anchors (deduped, sorted by reading order)
4. Builds a **layout map** with coordinates in screenshot-image space
5. Generates a **prompt hint** for the LLM with anchor coordinates

The result returned to the model looks like:

```
Full-resolution screenshot captured (2560x1600) with grid overlay.
OCR anchors: "Inbox" at (120, 45); "Compose" at (85, 130); "Search mail" at (450, 45).
OCR layout: [e1 "Inbox" center=(120, 45) box=(80, 30, 80x30)] [e2 "Compose" center=(85, 130) box=(40, 115, 90x30)]
```

The agent can now click `"Compose"` at `(85, 130)` instead of guessing where the button might be.

### Platform Engines

| Platform | Engine | How it runs |
|----------|--------|-------------|
| **macOS** | Apple Vision framework | Native Swift script via `xcrun swift` — no Xcode required |
| **Windows** | Windows.Media.Ocr | PowerShell script using built-in UWP OCR API |
| **Linux** | — | Not available yet (null adapter, graceful no-op) |

Both engines run **locally and offline**. No data leaves the machine. No API keys needed.

### Standalone OCR Usage

The OCR subsystem is available as a separate import for use outside the computer tool:

```typescript
import {
  recognizeText,
  buildOcrLayout,
  summarizeOcr,
  createOcrAdapter,
  createMacOsVisionOcrAdapter,
  createWindowsMediaOcrAdapter,
  createNullOcrAdapter,
} from "@atomicbotai/computer-use/ocr";
import type {
  OcrResult,
  OcrLine,
  OcrBoundingBox,
  OcrAnchorPoint,
  OcrAdapter,
  OcrLayout,
  OcrSummary,
} from "@atomicbotai/computer-use/ocr";

// Recognize text from any image
const result = await recognizeText({
  imagePath: "./screenshot.png",
  imageWidth: 2560,
  imageHeight: 1600,
});

// result.lines → array of detected text lines:
// [
//   {
//     text: "Compose",
//     confidence: 0.98,
//     bbox: { left: 40, top: 115, width: 90, height: 30 },
//     center: { x: 85, y: 130 }
//   },
//   ...
// ]

// Build a structured layout for LLM consumption
const layout = buildOcrLayout(result);
// layout.elements → top elements with IDs, sorted by reading order
// layout.promptHint → ready-to-use prompt string

// Or get a compact summary with anchor points
const summary = summarizeOcr(result);
// summary.text → 'OCR anchors: "Inbox" at (120, 45); "Compose" at (85, 130)'
// summary.anchors → [{ text: "Inbox", x: 120, y: 45, confidence: 0.99 }, ...]
```

### Custom OCR Adapters

You can create your own OCR adapter (e.g. Tesseract for Linux) by implementing the `OcrAdapter` interface:

```typescript
import type { OcrAdapter, RecognizeTextParams, OcrResult } from "@atomicbotai/computer-use/ocr";

const myAdapter: OcrAdapter = {
  async recognizeText(params: RecognizeTextParams): Promise<OcrResult | null> {
    // params.imagePath — path to the screenshot image
    // params.imageWidth / imageHeight — image dimensions
    // params.signal — AbortSignal for cancellation
    //
    // Return OcrResult with lines array, or null on failure
    return {
      engine: "my-custom-engine",
      imageWidth: params.imageWidth,
      imageHeight: params.imageHeight,
      lines: [
        {
          text: "Detected text",
          confidence: 0.95,
          bbox: { left: 100, top: 200, width: 150, height: 25 },
          center: { x: 175, y: 212 },
        },
      ],
    };
  },
};
```

## Configuration

```typescript
type ComputerToolOptions = {
  overlay?: {
    enabled?: boolean;  // Show "agent active" overlay (default: true)
    color?: string;     // Hex color without # (default: "00BFFF")
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
import { executeScreenshot, executeClick, executeType } from "@atomicbotai/computer-use/actions";

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
} from "@atomicbotai/computer-use/ocr";
import type { OcrResult, OcrAdapter } from "@atomicbotai/computer-use/ocr";

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
} from "@atomicbotai/computer-use/overlay";

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
} from "@atomicbotai/computer-use/session-lock";

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
import { mapToScreen, storeCoordMap } from "@atomicbotai/computer-use/coord-mapping";

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
