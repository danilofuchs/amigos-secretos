export {};

declare global {
  interface Window {
    confetti?: (options: {
      particleCount?: number;
      spread?: number;
      origin: { x?: number; y?: number };
    }) => {};
  }
}
