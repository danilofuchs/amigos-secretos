import type { SVGProps } from 'react';
type IconName =
  | 'arrow'
  | 'back'
  | 'plus'
  | 'close'
  | 'copy'
  | 'check'
  | 'chevron'
  | 'lock'
  | 'people'
  | 'send';
const paths: Record<IconName, string> = {
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  back: 'M20 12H5m6-6-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  copy: 'M9 8V4h11v13h-4M4 8h11v13H4z',
  check: 'm5 12 4 4L19 6',
  chevron: 'm6 9 6 6 6-6',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v2',
  people:
    'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 9v-2a6 6 0 0 1 12 0v2m2-17a4 4 0 0 1 0 8m2 3a6 6 0 0 1 4 6',
  send: 'm3 11 18-8-8 18-2-8-8-2Zm8 2L21 3',
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
