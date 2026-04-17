export type OverlayAdapter = {
  show(): Promise<void>;
  hide(): Promise<void>;
  setDescription(text: string): Promise<void>;
};
