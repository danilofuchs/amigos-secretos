import localFont from 'next/font/local';

export const handwriting = localFont({
  src: '../../public/fonts/caveat.ttf',
  variable: '--font-handwriting',
  weight: '400 700',
  display: 'swap',
});
export const ui = localFont({
  src: '../../public/fonts/figtree.ttf',
  variable: '--font-ui',
  weight: '300 900',
  display: 'swap',
});
