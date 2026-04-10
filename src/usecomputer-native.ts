import { createBridge } from "usecomputer";

type ScreenshotInput = {
  display?: number | null;
  path?: string | null;
  window?: number | null;
  region?: { x: number; y: number; width: number; height: number } | null;
  annotate?: unknown | null;
};
type ClickInput = {
  point: { x: number; y: number };
  button?: "left" | "right" | "middle";
  count?: number;
  modifiers?: string[];
};
type TypeTextInput = { text: string; delayMs?: number | null };
type PressInput = { key: string; count?: number; delayMs?: number | null };
type ScrollInput = {
  direction: "up" | "down" | "left" | "right";
  amount: number;
  at?: { x: number; y: number } | null;
};

const bridge = createBridge();

export async function screenshot(input: ScreenshotInput): Promise<{
  path: string;
  captureX: number;
  captureY: number;
  captureWidth: number;
  captureHeight: number;
  imageWidth: number;
  imageHeight: number;
  coordMap: string;
  hint: string;
  desktopIndex: number;
}> {
  return bridge.screenshot({
    path: input.path ?? undefined,
    display: input.display ?? undefined,
    window: input.window ?? undefined,
    region: input.region ?? undefined,
    annotate: (input.annotate ?? undefined) as boolean | undefined,
  });
}

export async function click(input: ClickInput) {
  return bridge.click({
    point: input.point,
    button: input.button ?? "left",
    count: input.count ?? 1,
    modifiers: input.modifiers ?? [],
  });
}

export async function typeText(input: TypeTextInput) {
  return bridge.typeText({
    text: input.text,
    delayMs: input.delayMs ?? undefined,
  });
}

export async function press(input: PressInput) {
  return bridge.press({
    key: input.key,
    count: input.count ?? 1,
    delayMs: input.delayMs ?? undefined,
  });
}

export async function scroll(input: ScrollInput) {
  return bridge.scroll({
    direction: input.direction,
    amount: input.amount,
    at: input.at ?? undefined,
  });
}

export async function mousePosition(): Promise<{ x: number; y: number }> {
  return bridge.mousePosition();
}

export async function drag(input: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  cp?: { x: number; y: number } | null;
  button?: "left" | "right" | "middle";
}) {
  return bridge.drag({
    from: input.from,
    to: input.to,
    cp: input.cp ?? undefined,
    button: input.button ?? "left",
  });
}

export async function mouseMove(point: { x: number; y: number }) {
  return bridge.mouseMove(point);
}

export async function displayList(): Promise<
  Array<{
    index: number;
    name: string;
    width: number;
    height: number;
    scale: number;
    isPrimary: boolean;
  }>
> {
  return bridge.displayList();
}
