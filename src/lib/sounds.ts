const FILES = {
  tear: '/sounds/tear.mp3',
  shuffle: '/sounds/shuffle.mp3',
  fold: '/sounds/fold.mp3',
  pen: '/sounds/pen.mp3',
  pencil: '/sounds/pencil.mp3',
  eraser: '/sounds/eraser.mp3',
} as const;
export type Sound = keyof typeof FILES;

type AudioSession = { type: string };
declare global {
  interface Navigator {
    readonly audioSession?: AudioSession;
  }
}

const MUTED_KEY = 'sounds-muted';
const listeners = new Set<() => void>();
let muted: boolean | undefined;

export function isMuted() {
  if (muted === undefined) {
    try {
      muted = localStorage.getItem(MUTED_KEY) === '1';
    } catch {
      muted = false;
    }
  }
  return muted;
}
export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTED_KEY, value ? '1' : '0');
  } catch {
    /* kept for this page only */
  }
  for (const listener of listeners) listener();
}
export function subscribeMuted(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let context: AudioContext | null = null;
const files = new Map<Sound, Promise<ArrayBuffer>>();
const buffers = new Map<Sound, Promise<AudioBuffer>>();

function fetchFile(sound: Sound) {
  let file = files.get(sound);
  if (!file) {
    file = fetch(FILES[sound]).then((response) => response.arrayBuffer());
    files.set(sound, file);
    file.catch(() => files.delete(sound));
  }
  return file;
}

/** Downloads sounds ahead of time, so the first one plays on cue. */
export function preloadSounds(...sounds: Sound[]) {
  for (const sound of sounds) void fetchFile(sound).catch(() => {});
}

function audio() {
  if (typeof AudioContext === 'undefined') return null;
  if (!context) {
    // Mixes with the person's own music and stays quiet when the phone is on silent.
    if (navigator.audioSession) navigator.audioSession.type = 'ambient';
    context = new AudioContext();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

const FADE = 0.06;

/**
 * Plays a sound `delay` seconds from now. With `duration`, it loops to last exactly that long and
 * fades out; with `from` as well, it plays just that stretch of the file once. Returns a way to stop
 * it early. Browsers only allow the first sound from a tap or click.
 */
export function playSound(
  sound: Sound,
  {
    delay = 0,
    rate = 1,
    volume = 1,
    duration,
    from,
  }: { delay?: number; rate?: number; volume?: number; duration?: number; from?: number } = {},
): () => void {
  if (isMuted()) return () => {};
  const ctx = audio();
  if (!ctx) return () => {};
  const startAt = ctx.currentTime + delay;
  let stopped = false,
    /** Set only once playing, so stopping early never touches a sound that never began. */
    source: AudioBufferSourceNode | null = null,
    gain: GainNode | null = null;
  let buffer = buffers.get(sound);
  if (!buffer) {
    buffer = fetchFile(sound).then((data) => ctx.decodeAudioData(data.slice(0)));
    buffers.set(sound, buffer);
    buffer.catch(() => buffers.delete(sound));
  }
  void buffer
    .then((decoded) => {
      if (stopped) return;
      const node = ctx.createBufferSource();
      node.buffer = decoded;
      node.playbackRate.value = rate;
      const level = ctx.createGain();
      level.gain.value = volume;
      node.connect(level).connect(ctx.destination);
      const at = Math.max(ctx.currentTime, startAt);
      node.loop = duration !== undefined && from === undefined;
      node.start(at, from ?? 0);
      // A slice cut from mid-recording would click without a short fade in.
      if (from !== undefined) {
        level.gain.setValueAtTime(0, at);
        level.gain.linearRampToValueAtTime(volume, at + 0.012);
      }
      if (duration !== undefined) {
        level.gain.setValueAtTime(volume, at + Math.max(0, duration - FADE));
        level.gain.linearRampToValueAtTime(0, at + duration);
        node.stop(at + duration);
      }
      source = node;
      gain = level;
    })
    .catch(() => {});
  return () => {
    stopped = true;
    if (!source || !gain) return;
    gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
    source.stop(ctx.currentTime + FADE);
  };
}

/** The pencil recording's length, in seconds; each letter plays a stroke from somewhere in it. */
const PENCIL_LENGTH = 1.8;
let lastScratch = 0;
/** One short pencil stroke for a typed letter; fast typing thins out instead of piling up. */
export function playPencil() {
  const now = performance.now();
  if (now - lastScratch < 70) return;
  lastScratch = now;
  playSound('pencil', {
    from: Math.random() * (PENCIL_LENGTH - 0.12),
    duration: 0.12,
    volume: 0.8 + Math.random() * 0.2,
  });
}

let lastRub = 0;
/** A short rub for deleted letters, a longer one for a whole word or selection; held keys thin out. */
export function playEraser(removed: number) {
  const now = performance.now();
  if (now - lastRub < 90) return;
  lastRub = now;
  const length = removed > 2 ? 0.35 : 0.14;
  playSound('eraser', {
    from: Math.random() * (1.45 - length),
    duration: length,
    volume: 0.8 + Math.random() * 0.2,
  });
}
