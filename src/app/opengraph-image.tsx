import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Amigos Secretos: um bilhete de caderno escrito à caneta azul';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DESK = '#e7dcc5';
const PAPER = '#fffefb';
const INK = '#2146a0';
const RULE = '#c4d4ec';
const MARGIN = '#d79897';
const TEXT = '#353b47';

const SLIP = { width: 760, height: 300 };
/** A slip of notebook paper with a hand-torn bottom edge: uneven steps, uneven depth. */
const TORN = (() => {
  const noise = (n: number) => {
    const v = Math.sin(n * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  let d = `M0 0 H${SLIP.width} V${SLIP.height - 14}`;
  for (let x = SLIP.width, i = 0; x > 0; i++) {
    x = Math.max(0, x - 9 - noise(i) * 22);
    d += ` L${x.toFixed(1)} ${(SLIP.height - 18 + noise(i + 40) * 14).toFixed(1)}`;
  }
  return `${d} Z`;
})();

function FoldedSlip({ rotate, top, left }: { rotate: number; top: number; left: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        width: 150,
        height: 100,
        display: 'flex',
        transform: `rotate(${rotate}deg)`,
        background: `linear-gradient(135deg, ${PAPER} 48%, #ece6d8 50%, #fbf8f0 52%)`,
        boxShadow: '0 6px 10px rgba(64, 53, 38, 0.22)',
      }}
    >
      <div style={{ width: 75, height: 100, borderRight: '2px solid rgba(120, 104, 76, 0.25)' }} />
    </div>
  );
}

export default async function Image() {
  const [handwriting, ui] = await Promise.all([
    // Static instances: the image renderer can't read the site's variable fonts.
    readFile(join(process.cwd(), 'src/app/og-fonts/caveat-600.ttf')),
    readFile(join(process.cwd(), 'src/app/og-fonts/public-sans-400.ttf')),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: DESK,
        fontFamily: 'Public Sans',
      }}
    >
      <FoldedSlip rotate={-14} top={404} left={880} />
      <FoldedSlip rotate={9} top={452} left={1020} />
      <FoldedSlip rotate={-4} top={150} left={960} />
      <div
        style={{
          position: 'absolute',
          top: 104,
          left: 90,
          width: SLIP.width,
          height: SLIP.height,
          display: 'flex',
          transform: 'rotate(-2.5deg)',
        }}
      >
        <svg
          width={SLIP.width}
          height={SLIP.height}
          viewBox={`0 0 ${SLIP.width} ${SLIP.height}`}
          style={{ position: 'absolute', top: 6, left: 4 }}
        >
          <path d={TORN} fill="rgba(64, 53, 38, 0.14)" />
        </svg>
        <svg
          width={SLIP.width}
          height={SLIP.height}
          viewBox={`0 0 ${SLIP.width} ${SLIP.height}`}
          style={{ position: 'absolute' }}
        >
          <path d={TORN} fill={PAPER} />
          {[72, 136, 200, 264].map((y) => (
            <line key={y} x1="0" x2={SLIP.width} y1={y} y2={y} stroke={RULE} strokeWidth="2" />
          ))}
          <line x1="70" x2="70" y1="0" y2="292" stroke={MARGIN} strokeWidth="2" />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 92,
            left: 104,
            display: 'flex',
            fontFamily: 'Caveat',
            fontSize: 104,
            fontWeight: 600,
            color: INK,
            lineHeight: 1,
          }}
        >
          Amigos Secretos
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 490,
          width: 700,
          display: 'flex',
          fontSize: 32,
          lineHeight: 1.35,
          color: TEXT,
        }}
      >
        Sorteie os nomes e mande um bilhete secreto para cada pessoa.
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Caveat', data: handwriting, weight: 600, style: 'normal' },
        { name: 'Public Sans', data: ui, weight: 400, style: 'normal' },
      ],
    },
  );
}
