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
import { foldAngles, footprintCenter, STRIP_ASPECT, stripPoint, stripWidthFor } from './paper-fold';
import { drawStripFaces, type NameLayout } from './paper-texture';

export type PaperStrip = {
  readonly progress: number;
  readonly stripWidth: number;
  readonly layout: NameLayout;
  /** 1 while upright, -1 while turned upside down on the table. */
  readonly orientation: 1 | -1;
  turn(instant?: boolean): void;
  setProgress(progress: number): void;
  animateTo(target: number, options?: { velocity?: number; instant?: boolean }): void;
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
const LAYER_GAP = 0.7;
const FOV = 14;
const TILT = -0.025;
const STIFFNESS = 64;
const TURN_STIFFNESS = 110;
const TURN_LIFT = 0.3;
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

  const faces = drawStripFaces(options.name, options.fontFamily);
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

  const quarters = [0, 1, 2, 3].map((index) => {
    const geometry = new BufferGeometry();
    const count = (SEGMENTS + 1) * 2;
    const uv = new Float32Array(count * 2),
      indices: number[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const u = (index + i / SEGMENTS) / 4;
      uv.set([u, 0, u, 1], i * 4);
      if (i < SEGMENTS) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
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
  let turnAt = 0,
    turnTo = 0,
    turnSpeed = 0,
    turning = false,
    settledPending = false;

  function pose() {
    const q = stripW / 4,
      h = stripW / STRIP_ASPECT;
    const angles = foldAngles(progress),
      center = footprintCenter(progress) * q;
    for (const { index, geometry } of quarters) {
      const position = geometry.getAttribute('position') as BufferAttribute;
      for (let i = 0; i <= SEGMENTS; i++) {
        const [x, z] = stripPoint(index + i / SEGMENTS, angles, q, LAYER_GAP, index);
        position.setXYZ(i * 2, x - center, -h / 2, z);
        position.setXYZ(i * 2 + 1, x - center, h / 2, z);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    strip.rotation.z = TILT + Math.PI * turnAt;
    strip.scale.setScalar(1 - TURN_LIFT * Math.sin(Math.PI * Math.min(1, Math.max(0, turnAt))));
    renderer.render(scene, camera);
  }

  function startTurn(to: number) {
    turnTo = to;
    if (!turning) {
      turning = true;
      turnSpeed = 0;
    }
  }

  function finish() {
    if (target === 2 && turnTo === 1) {
      startTurn(0);
      return;
    }
    if (!turning && settledPending) {
      settledPending = false;
      options.onSettle(target);
    }
  }

  function tick(now: number) {
    frame = 0;
    const dt = Math.min(0.034, lastTime ? (now - lastTime) / 1000 : 1 / 60);
    lastTime = settling || turning ? now : 0;
    if (turning) {
      turnSpeed +=
        (TURN_STIFFNESS * (turnTo - turnAt) - 2 * Math.sqrt(TURN_STIFFNESS) * turnSpeed) * dt;
      turnAt += turnSpeed * dt;
      if (Math.abs(turnTo - turnAt) < 0.002 && Math.abs(turnSpeed) < 0.03) {
        turnAt = turnTo;
        turnSpeed = 0;
        turning = false;
        finish();
      }
    }
    if (settling) {
      velocity += (STIFFNESS * (target - progress) - 2 * Math.sqrt(STIFFNESS) * velocity) * dt;
      progress = Math.min(2, Math.max(0, progress + velocity * dt));
      if (Math.abs(target - progress) < 0.003 && Math.abs(velocity) < 0.04) {
        progress = target;
        velocity = 0;
        settling = false;
        settledPending = true;
        finish();
      }
    }
    if (settling || turning) frame = requestAnimationFrame(tick);
    pose();
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
    get orientation() {
      return turnTo === 1 ? -1 : 1;
    },
    turn(instant = false) {
      const to = turnTo === 1 ? 0 : 1;
      if (instant) {
        turnTo = turnAt = to;
        turning = false;
        schedule();
        return;
      }
      startTurn(to);
      lastTime = 0;
      schedule();
    },
    layout: faces.layout,
    setProgress(next) {
      settling = false;
      velocity = 0;
      progress = Math.min(2, Math.max(0, next));
      schedule();
    },
    animateTo(next, { velocity: initial = 0, instant = false } = {}) {
      target = next;
      if (instant) {
        settling = false;
        velocity = 0;
        progress = next;
        if (next === 2) {
          turnTo = turnAt = 0;
          turning = false;
        }
        schedule();
        options.onSettle(next);
        return;
      }
      if (!settling) velocity = initial;
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
