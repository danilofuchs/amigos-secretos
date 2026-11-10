import {
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Texture } from 'three';
import { SETTLE, SHAKE, TIP } from './basket-timing';
import { foldAngles, footprintCenter, STRIP_ASPECT, stripPoint } from './paper-fold';

export type BasketScene = {
  /** Screen position (CSS px, relative to the canvas) of the basket's opening. */
  mouth(): { x: number; y: number };
  /** Where the opening ends up once the basket has tipped over to pour. */
  pouredMouth(): { x: number; y: number };
  /**
   * Carries the basket, shrunk to `radius`, so it rests centred on a screen point, then tips it
   * over there. Returns where its opening ends up and how many seconds until things fall out.
   */
  pourInto(target: { x: number; y: number; radius: number }): {
    mouth: { x: number; y: number };
    pourAt: number;
  };
  dispose(): void;
};

type Options = {
  width: number;
  height: number;
  /** Names to write, fold and drop in. Empty: the basket only gives one shake. */
  names: string[];
  /** After the shake, tip the basket over its rim so whatever is inside falls out. */
  pour?: boolean;
  fontFamily: string;
  /** A slip starts folding, once per fold. */
  onFold?(): void;
  /** The shake begins: the slips start tumbling inside. */
  onShake?(): void;
  onDone(): void;
};

const FOV = 30;
const STEP = 0.17;
const APPEAR = 0.35;
const READ = 0.75;
const FOLD = 1.1;
/** Within the fold phase: the half fold, a beat, then the quarter fold. */
const FIRST_FOLD = [0, 0.4] as const;
const SECOND_FOLD = [0.58, 1] as const;
const FLY = 0.85;
const TIP_ANGLE = 2.2;
/** Seconds the basket takes to glide from the ceremony to where it pours. */
const TRAVEL = 0.75;
const MAX_SLIPS = 30;
const SEGMENTS = 3;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  const ctx = element.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { element, ctx };
}

function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Stakes run vertically; each weaver row passes over and under them alternately. */
function wickerTexture() {
  const { element, ctx } = canvas(1024, 512);
  const rand = random(7);
  const stake = 64,
    row = 28;
  ctx.fillStyle = '#5b4126';
  ctx.fillRect(0, 0, 1024, 512);
  for (let y = 0, r = 0; y < 512; y += row, r++) {
    for (let x = 0, k = 0; x < 1024; x += stake, k++) {
      const front = (r + k) % 2 === 0;
      if (front) {
        const g = ctx.createLinearGradient(0, y, 0, y + row);
        g.addColorStop(0, '#a8834f');
        g.addColorStop(0.45, '#e2c48e');
        g.addColorStop(1, '#8a6738');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x - 4, y + 2, stake + 8, row - 4, (row - 4) / 2);
        ctx.fill();
      } else {
        const g = ctx.createLinearGradient(x, 0, x + stake, 0);
        g.addColorStop(0.3, '#7d5c33');
        g.addColorStop(0.5, '#c9a46c');
        g.addColorStop(0.7, '#7d5c33');
        ctx.fillStyle = g;
        ctx.fillRect(x + stake * 0.32, y, stake * 0.36, row);
      }
    }
  }
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#3d2a14';
  for (let i = 0; i < 900; i++) {
    const x = rand() * 1024,
      y = rand() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + rand() * 14, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }
  const texture = new CanvasTexture(element);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

function ropeTexture() {
  const { element, ctx } = canvas(512, 64);
  ctx.fillStyle = '#8f6b3c';
  ctx.fillRect(0, 0, 512, 64);
  for (let x = -64; x < 576; x += 22) {
    const g = ctx.createLinearGradient(x, 0, x + 22, 64);
    g.addColorStop(0, '#6e5029');
    g.addColorStop(0.5, '#e0c08a');
    g.addColorStop(1, '#6e5029');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 30, 0);
    ctx.lineTo(x + 44, 0);
    ctx.lineTo(x + 14, 64);
    ctx.fill();
  }
  const texture = new CanvasTexture(element);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

function slipTexture(name: string, family: string) {
  const width = 512,
    height = Math.round(width / STRIP_ASPECT);
  const { element, ctx } = canvas(width, height);
  ctx.fillStyle = '#fffefb';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(122, 150, 204, .45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.72);
  ctx.lineTo(width, height * 0.72);
  ctx.stroke();
  let size = height * 0.62;
  ctx.font = `500 ${size}px ${family}`;
  const measured = ctx.measureText(name).width;
  if (measured > width * 0.86) size *= (width * 0.86) / measured;
  ctx.font = `500 ${size}px ${family}`;
  ctx.fillStyle = '#2146a0';
  ctx.textAlign = 'center';
  ctx.fillText(name, width / 2, height * 0.68);
  const texture = new CanvasTexture(element);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createBasketScene(canvasElement: HTMLCanvasElement, options: Options): BasketScene {
  const renderer = new WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(options.width, options.height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const { width, height } = options;
  const scene = new Scene();
  const distance = height / 2 / Math.tan((FOV * Math.PI) / 360);
  const camera = new PerspectiveCamera(FOV, width / height, 10, distance * 3);
  camera.position.set(0, 0, distance);

  scene.add(new AmbientLight(0xffffff, Math.PI * 0.55));
  const sun = new DirectionalLight(0xffffff, Math.PI * 0.6);
  sun.position.set(-0.4, 0.8, 1).multiplyScalar(distance);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 6;
  Object.assign(sun.shadow.camera, {
    left: -width,
    right: width,
    top: height,
    bottom: -height,
    near: 1,
    far: distance * 4,
  });
  scene.add(sun);

  const collecting = options.names.length > 0;
  const radius = Math.min(collecting ? 105 : 62, width * (collecting ? 0.2 : 0.3));
  const basketHeight = radius * 1.15;
  const basket = new Group();
  const restY = collecting ? -height * 0.2 : -height * 0.08;
  const restTilt = 0.42;
  basket.position.set(0, restY, 0);
  basket.rotation.x = restTilt;
  scene.add(basket);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(value: T) => {
    disposables.push(value);
    return value;
  };
  const weave = keep(wickerTexture());
  weave.repeat.set(3, 1.4);
  const rope = keep(ropeTexture());
  rope.repeat.set(18, 1);
  const wallGeometry = keep(new CylinderGeometry(radius, radius * 0.82, basketHeight, 64, 1, true));
  const outside = keep(
    new MeshLambertMaterial({ map: weave, side: FrontSide, shadowSide: DoubleSide }),
  );
  const inside = keep(new MeshLambertMaterial({ map: weave, side: BackSide, color: 0x8a7457 }));
  const wallOut = new Mesh(wallGeometry, outside);
  wallOut.castShadow = true;
  basket.add(wallOut, new Mesh(wallGeometry, inside));
  const floor = new Mesh(
    keep(new CircleGeometry(radius * 0.82, 48)),
    keep(new MeshLambertMaterial({ map: weave, color: 0x6f5a40, shadowSide: DoubleSide })),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -basketHeight / 2 + 0.5;
  // A solid bottom: without it the shadow is only a ring of wall.
  floor.castShadow = true;
  basket.add(floor);
  const rim = new Mesh(
    keep(new TorusGeometry(radius, Math.max(5, radius * 0.07), 14, 72)),
    keep(new MeshLambertMaterial({ map: rope })),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = basketHeight / 2;
  rim.castShadow = true;
  basket.add(rim);

  const ground = new Mesh(
    keep(new PlaneGeometry(width * 3, height * 3)),
    keep(new ShadowMaterial({ color: 0x4a361c, opacity: 0.22 })),
  );
  ground.position.set(0, basket.position.y - basketHeight * 0.55, -radius * 1.2);
  ground.rotation.x = -Math.PI / 2 + 0.42;
  ground.receiveShadow = true;
  scene.add(ground);

  type Slip = {
    mesh: Group;
    geometry: BufferGeometry;
    start: Vector3;
    delay: number;
    spin: Vector3;
    folds: number;
  };
  const slips: Slip[] = [];
  const names = options.names.slice(0, MAX_SLIPS);
  const step = Math.min(STEP, 3 / Math.max(1, names.length));
  const slipWidth = Math.min(width * 0.28, 170);
  const quarter = slipWidth / 4,
    slipHeight = slipWidth / STRIP_ASPECT;
  const columns = Math.max(1, Math.min(names.length, width < 520 ? 2 : 4));
  const backMaterial = keep(new MeshLambertMaterial({ color: 0xfbf8f1, side: BackSide }));
  names.forEach((name, i) => {
    const texture: Texture = keep(slipTexture(name, options.fontFamily));
    const geometry = keep(new BufferGeometry());
    const count = 4 * (SEGMENTS + 1) * 2;
    const uv = new Float32Array(count * 2),
      indices: number[] = [];
    for (let q = 0; q < 4; q++)
      for (let j = 0; j <= SEGMENTS; j++) {
        const v = (q * (SEGMENTS + 1) + j) * 2,
          u = (q + j / SEGMENTS) / 4;
        uv.set([u, 0, u, 1], v * 2);
        if (j < SEGMENTS) indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      }
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('uv', new BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    const front = keep(new MeshLambertMaterial({ map: texture, side: FrontSide }));
    const mesh = new Group();
    const face = new Mesh(geometry, front);
    mesh.add(face, new Mesh(geometry, backMaterial));
    const column = i % columns,
      row = Math.floor(i / columns);
    const span = columns * slipWidth + (columns - 1) * 28;
    const start = new Vector3(
      -span / 2 + slipWidth / 2 + column * (slipWidth + 28),
      height * 0.22 - row * (slipHeight + 26),
      40,
    );
    mesh.position.copy(start);
    mesh.visible = false;
    scene.add(mesh);
    slips.push({
      mesh,
      geometry,
      start,
      delay: i * step,
      spin: new Vector3((i % 3) - 1, ((i * 7) % 5) / 2 - 1, ((i * 5) % 3) - 1),
      folds: 0,
    });
  });

  function shapeSlip(slip: Slip, progress: number) {
    const angles = foldAngles(progress),
      center = footprintCenter(progress) * quarter;
    const position = slip.geometry.getAttribute('position') as BufferAttribute;
    for (let q = 0; q < 4; q++)
      for (let j = 0; j <= SEGMENTS; j++) {
        const [x, z] = stripPoint(q + j / SEGMENTS, angles, quarter, 0.6, q);
        const v = (q * (SEGMENTS + 1) + j) * 2;
        position.setXYZ(v, x - center, -slipHeight / 2, z);
        position.setXYZ(v + 1, x - center, slipHeight / 2, z);
      }
    position.needsUpdate = true;
    slip.geometry.computeVertexNormals();
  }

  const mouthLocal = new Vector3(0, basketHeight * 0.5, 0);
  const inLocal = new Vector3(0, -basketHeight * 0.25, 0);
  const collectEnd = (names.length - 1) * step + APPEAR + READ + FOLD + FLY;
  const pour = !collecting && options.pour === true;
  const total = (collecting ? collectEnd + 0.15 : SETTLE) + SHAKE + (pour ? TIP : 0);
  const shakeStart = total - SHAKE - (pour ? TIP : 0);
  const lift = radius * 0.55;
  // Where the basket rests and how big it is; a carried basket gets a new home and size.
  const home = new Vector3(0, restY, 0);
  let size = 1;
  const tipped = (amount: number) => {
    basket.rotation.set(restTilt + TIP_ANGLE * amount, 0, 0);
    basket.position.set(home.x, home.y + lift * size * amount, home.z);
  };
  const groundMaterial = ground.material as ShadowMaterial;
  let carry: {
    began: number;
    from: Vector3;
    to: Vector3;
    fromSize: number;
    toSize: number;
  } | null = null;
  const toScreen = (world: Vector3) => {
    camera.updateMatrixWorld();
    const point = world.project(camera);
    return { x: ((point.x + 1) / 2) * width, y: ((1 - point.y) / 2) * height };
  };
  let frame = 0,
    began = 0,
    finished = false,
    shaking = false;

  function tick(now: number) {
    began ||= now;
    const t = (now - began) / 1000;
    const mouth = basket.localToWorld(mouthLocal.clone());
    const inside = basket.localToWorld(inLocal.clone());
    for (const slip of slips) {
      const local = t - slip.delay;
      if (local < 0) continue;
      const appear = clamp(local / APPEAR),
        fold = clamp((local - APPEAR - READ) / FOLD),
        fly = clamp((local - APPEAR - READ - FOLD) / FLY);
      slip.mesh.visible = fly < 1;
      slip.mesh.scale.setScalar(0.6 + 0.4 * ease(appear));
      const half = clamp((fold - FIRST_FOLD[0]) / (FIRST_FOLD[1] - FIRST_FOLD[0])),
        quarterFold = clamp((fold - SECOND_FOLD[0]) / (SECOND_FOLD[1] - SECOND_FOLD[0]));
      const started = (fold > FIRST_FOLD[0] ? 1 : 0) + (fold > SECOND_FOLD[0] ? 1 : 0);
      for (; slip.folds < started; slip.folds++) options.onFold?.();
      shapeSlip(slip, 2 - ease(half) - ease(quarterFold));
      const f = ease(fly);
      const peak = new Vector3(
        (slip.start.x + mouth.x) / 2,
        Math.max(slip.start.y, mouth.y) + 90,
        120,
      );
      const arc = clamp(f / 0.8),
        drop = clamp((f - 0.8) / 0.2);
      const bezier = slip.start
        .clone()
        .multiplyScalar((1 - arc) ** 2)
        .add(peak.clone().multiplyScalar(2 * (1 - arc) * arc))
        .add(mouth.clone().multiplyScalar(arc ** 2));
      slip.mesh.position.copy(drop > 0 ? mouth.clone().lerp(inside, drop) : bezier);
      slip.mesh.position.y -= (1 - appear) * 20;
      slip.mesh.rotation.set(
        slip.spin.x * f * 4 - fold * 0.3,
        slip.spin.y * f * 5,
        slip.spin.z * f * 3 + (1 - appear) * 0.2,
      );
    }
    const shakeT = Math.min(t - shakeStart, SHAKE);
    if (shakeT > 0 && !shaking) {
      shaking = true;
      options.onShake?.();
    }
    const tipT = t - shakeStart - SHAKE;
    if (carry) {
      const k = (now - carry.began) / 1000;
      const glide = ease(clamp(k / TRAVEL));
      home.lerpVectors(carry.from, carry.to, glide);
      size = carry.fromSize + (carry.toSize - carry.fromSize) * glide;
      basket.scale.setScalar(size);
      groundMaterial.opacity = 0.22 * (1 - glide);
      tipped(easeOutBack(clamp((k - TRAVEL) / TIP)));
    } else if (pour && tipT > 0) tipped(easeOutBack(clamp(tipT / TIP)));
    else if (t >= total && collecting) {
      // Waiting for the draw to be saved: the basket is held, swaying a little.
      const idle = t - total;
      basket.rotation.set(restTilt + Math.sin(idle * 1.7) * 0.04, 0, Math.sin(idle * 2.3) * 0.05);
      basket.position.set(home.x, home.y, home.z);
    } else if (shakeT > 0) {
      const envelope = Math.sin(Math.PI * Math.min(1, shakeT / SHAKE)) ** 0.5;
      basket.rotation.z = Math.sin(shakeT * 26) * 0.3 * envelope;
      basket.rotation.x = restTilt + Math.sin(shakeT * 19 + 1.1) * 0.14 * envelope;
      basket.rotation.y = Math.sin(shakeT * 13) * 0.35 * envelope;
      basket.position.x = Math.sin(shakeT * 26 + 0.6) * radius * 0.16 * envelope;
      basket.position.y = restY + Math.abs(Math.sin(shakeT * 21)) * radius * 0.1 * envelope;
    }
    renderer.render(scene, camera);
    if (t >= total && !finished) {
      finished = true;
      options.onDone();
    }
    // A collecting basket keeps living after its shake, until it is carried off or disposed.
    if (t < total || collecting) frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);

  return {
    mouth() {
      scene.updateMatrixWorld();
      return toScreen(basket.localToWorld(mouthLocal.clone()));
    },
    pouredMouth() {
      const { position, rotation } = basket;
      const saved = { position: position.clone(), rotation: rotation.clone() };
      tipped(1);
      scene.updateMatrixWorld();
      const point = toScreen(basket.localToWorld(mouthLocal.clone()));
      position.copy(saved.position);
      rotation.copy(saved.rotation);
      basket.updateMatrixWorld();
      return point;
    },
    pourInto(target) {
      const to = new Vector3(target.x - width / 2, height / 2 - target.y, 0);
      const toSize = target.radius / radius;
      carry = {
        began: performance.now(),
        from: basket.position.clone(),
        to,
        fromSize: size,
        toSize,
      };
      const { position, rotation, scale } = basket;
      const saved = {
        position: position.clone(),
        rotation: rotation.clone(),
        scale: scale.clone(),
      };
      home.copy(to);
      size = toSize;
      scale.setScalar(toSize);
      tipped(1);
      scene.updateMatrixWorld();
      const mouth = toScreen(basket.localToWorld(mouthLocal.clone()));
      position.copy(saved.position);
      rotation.copy(saved.rotation);
      scale.copy(saved.scale);
      home.copy(carry.from);
      size = carry.fromSize;
      basket.updateMatrixWorld();
      return { mouth, pourAt: TRAVEL + TIP * 0.7 };
    },
    dispose() {
      cancelAnimationFrame(frame);
      for (const item of disposables) item.dispose();
      sun.shadow.dispose();
      renderer.resetState();
      renderer.dispose();
    },
  };
}
