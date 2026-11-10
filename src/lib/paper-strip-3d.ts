import {
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import {
  creaseLines,
  FOLDED_MOST,
  foldAngles,
  foldPoint,
  footprintCenter,
  footprintMiddle,
  STRIP_ASPECT,
  stripWidthFor,
} from './paper-fold';
import { drawStripFaces, type NameLayout } from './paper-texture';

export type PaperStrip = {
  readonly progress: number;
  readonly stripWidth: number;
  readonly layout: NameLayout;
  setProgress(progress: number): void;
  animateTo(target: number, options?: { velocity?: number; instant?: boolean }): void;
  /** Flicks the paper toward opening and lets it fall back where it rests. */
  nudge(velocity: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
};

type Options = {
  name: string;
  fontFamily: string;
  width: number;
  height: number;
  onSettle(progress: number): void;
  onContextLost(): void;
};

const SEGMENTS = 16;
/** Rows match the columns' spacing, so the corner fold runs along grid diagonals. */
const ROWS = 16;
const LAYER_GAP = 0.7;
const FOV = 14;
const TILT = -0.025;
const STIFFNESS = 64;
/** A new fold line starts faint and deepens each time the paper folds shut there, up to WORN. */
const FIRST = 0.55;
const WEAR = 0.35;
const WORN = 2.6;
const LIGHT = { x: -0.22, y: 0.34, z: 1 };
const LIGHT_DOT = 1 / Math.hypot(LIGHT.x, LIGHT.y, LIGHT.z);

export function createPaperStrip(canvas: HTMLCanvasElement, options: Options): PaperStrip {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 2000);
  // Lambert divides by π; flat paper facing the camera must read as exactly the paper white.
  const ambient = new AmbientLight(0xffffff, Math.PI * 0.58);
  const sun = new DirectionalLight(0xffffff, (Math.PI * 0.42) / LIGHT_DOT);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0004;
  scene.add(ambient, sun, sun.target);

  const ground = new Mesh(
    new PlaneGeometry(4000, 4000),
    new ShadowMaterial({ color: 0x4a361c, opacity: 0.2 }),
  );
  ground.position.z = -6;
  ground.receiveShadow = true;
  scene.add(ground);

  // How worn each fold's creases are, by the stage it folds down to; the slip arrives folded twice.
  const wear = new Map([
    [1, 1],
    [0, 1],
  ]);
  const creases = () =>
    [...wear].flatMap(([stage, depth]) => creaseLines(stage).map((line) => ({ line, depth })));
  const faces = drawStripFaces(options.name, options.fontFamily, creases());
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const texture = (image: HTMLCanvasElement) => {
    const map = new CanvasTexture(image);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = anisotropy;
    return map;
  };
  const frontMap = texture(faces.front),
    backMap = texture(faces.back);
  const paper = { alphaTest: 0.5, alphaToCoverage: true };
  const frontMaterial = new MeshLambertMaterial({
    ...paper,
    map: frontMap,
    side: FrontSide,
    shadowSide: DoubleSide,
  });
  const backMaterial = new MeshLambertMaterial({ ...paper, map: backMap, side: BackSide });

  const strip = new Group();
  strip.rotation.z = TILT;
  scene.add(strip);

  // A grid per quarter with a point in the middle of every cell, so creases can run along rows,
  // columns, or either diagonal.
  const corner = (i: number, j: number) => j * (SEGMENTS + 1) + i;
  const middle = (i: number, j: number) => (SEGMENTS + 1) * (ROWS + 1) + j * SEGMENTS + i;
  const grid: [number, number][] = [];
  for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= SEGMENTS; i++) grid.push([i, j]);
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < SEGMENTS; i++) grid.push([i + 0.5, j + 0.5]);
  const indices: number[] = [];
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < SEGMENTS; i++) {
      const m = middle(i, j),
        a = corner(i, j),
        b = corner(i + 1, j),
        c = corner(i + 1, j + 1),
        d = corner(i, j + 1);
      indices.push(a, b, m, b, c, m, c, d, m, d, a, m);
    }
  const quarters = [0, 1, 2, 3].map((index) => {
    const geometry = new BufferGeometry();
    const uv = new Float32Array(grid.length * 2);
    grid.forEach(([i, j], k) => uv.set([(index + i / SEGMENTS) / 4, j / ROWS], k * 2));
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(grid.length * 3), 3));
    geometry.setAttribute('uv', new BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    const front = new Mesh(geometry, frontMaterial),
      back = new Mesh(geometry, backMaterial);
    front.castShadow = true;
    front.frustumCulled = back.frustumCulled = false;
    strip.add(front, back);
    return { index, geometry };
  });

  let width = 1,
    height = 1,
    stripW = stripWidthFor(options.width);
  let progress = 0,
    velocity = 0,
    target = 0,
    settling = false;
  let frame = 0,
    lastTime = 0,
    disposed = false;
  let settledPending = false,
    nudging = false;

  function pose() {
    const q = stripW / 4,
      h = stripW / STRIP_ASPECT;
    const angles = foldAngles(progress),
      center = footprintCenter(progress) * q,
      middleY = footprintMiddle(progress) * h;
    for (const { index, geometry } of quarters) {
      const position = geometry.getAttribute('position') as BufferAttribute;
      grid.forEach(([i, j], k) => {
        const [x, y, z] = foldPoint(index + i / SEGMENTS, j / ROWS, angles, q, h, LAYER_GAP, index);
        position.setXYZ(k, x - center, y - middleY, z);
      });
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    renderer.render(scene, camera);
  }

  // A fold presses its creases each time the paper closes there, resting or passing through. It must
  // have opened well past the fold since, so a nudge or a hovering finger doesn't count twice. The
  // creases are tucked inside at that moment, so the redraw is unseen.
  const opened = new Set<number>();
  function press(next: number) {
    let changed = false;
    for (let stage = FOLDED_MOST; stage <= 1; stage++) {
      if (next > stage + 0.5) opened.add(stage);
      else if (next <= stage + 0.01 && opened.delete(stage)) {
        wear.set(stage, Math.min(WORN, (wear.get(stage) ?? FIRST - WEAR) + WEAR));
        changed = true;
      }
    }
    if (changed) {
      faces.setCreases(creases());
      frontMap.needsUpdate = backMap.needsUpdate = true;
    }
  }

  function tick(now: number) {
    frame = 0;
    const dt = Math.min(0.034, lastTime ? (now - lastTime) / 1000 : 1 / 60);
    lastTime = settling ? now : 0;
    if (settling) {
      velocity += (STIFFNESS * (target - progress) - 2 * Math.sqrt(STIFFNESS) * velocity) * dt;
      progress = Math.min(2, Math.max(FOLDED_MOST, progress + velocity * dt));
      press(progress);
      if (Math.abs(target - progress) < 0.003 && Math.abs(velocity) < 0.04) {
        progress = target;
        press(progress);
        velocity = 0;
        settling = false;
        nudging = false;
        settledPending = true;
      }
    }
    if (settling) frame = requestAnimationFrame(tick);
    pose();
    if (settledPending) {
      settledPending = false;
      options.onSettle(target);
    }
  }

  function schedule() {
    if (!frame && !disposed) frame = requestAnimationFrame(tick);
  }

  function resize(nextWidth: number, nextHeight: number) {
    width = Math.max(1, nextWidth);
    height = Math.max(1, nextHeight);
    stripW = stripWidthFor(width);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    const distance = height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.aspect = width / height;
    camera.position.set(0, 0, distance);
    camera.near = Math.max(1, distance - stripW);
    camera.far = distance + 40;
    camera.updateProjectionMatrix();
    const reach = stripW * 0.75;
    Object.assign(sun.shadow.camera, {
      left: -reach,
      right: reach,
      top: reach,
      bottom: -reach,
      near: 1,
      far: 4000,
    });
    sun.shadow.camera.updateProjectionMatrix();
    sun.position.set(LIGHT.x, LIGHT.y, LIGHT.z).multiplyScalar(1600);
    schedule();
  }

  function lost(event: Event) {
    event.preventDefault();
    options.onContextLost();
  }
  canvas.addEventListener('webglcontextlost', lost);
  resize(options.width, options.height);

  return {
    get progress() {
      return progress;
    },
    get stripWidth() {
      return stripW;
    },
    layout: faces.layout,
    setProgress(next) {
      settling = nudging = false;
      velocity = 0;
      progress = Math.min(2, Math.max(FOLDED_MOST, next));
      press(progress);
      schedule();
    },
    animateTo(next, { velocity: initial = 0, instant = false } = {}) {
      target = next;
      // A tap mid-nudge starts the fold afresh instead of inheriting the flick.
      if (nudging) settling = nudging = false;
      if (instant) {
        settling = false;
        velocity = 0;
        progress = next;
        press(progress);
        schedule();
        options.onSettle(next);
        return;
      }
      if (!settling) velocity = initial;
      settling = true;
      settledPending = false;
      schedule();
    },
    nudge(kick) {
      if (settling && !nudging) return;
      nudging = true;
      velocity += kick;
      settling = true;
      settledPending = false;
      schedule();
    },
    resize,
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      canvas.removeEventListener('webglcontextlost', lost);
      for (const { geometry } of quarters) geometry.dispose();
      for (const disposable of [
        frontMaterial,
        backMaterial,
        frontMap,
        backMap,
        ground.geometry,
        ground.material,
      ])
        disposable.dispose();
      sun.shadow.dispose();
      renderer.resetState();
      renderer.dispose();
    },
  };
}
