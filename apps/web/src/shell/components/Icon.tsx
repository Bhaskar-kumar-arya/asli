export type IconName =
  | 'register'
  | 'entry'
  | 'instructions'
  | 'back'
  | 'aloud'
  | 'camera'
  | 'bill'
  | 'qr'
  | 'keyed'
  | 'members'
  | 'next'
  | 'source'
  | 'close';

const PATHS: Record<IconName, string> = {
  // Ruled register sheet.
  register: 'M4 3h16v18H4zM8 3v18M11 8h6M11 12h6M11 16h4',
  // A new line struck into the register.
  entry: 'M4 3h16v18H4zM8 3v18M11 12h6M14 9v6',
  // Standing instructions: a clipped sheet.
  instructions: 'M5 5h14v16H5zM9 3h6v4H9zM9 12h6M9 16h4',
  back: 'M14 5l-7 7 7 7M7 12h13',
  // Sound issuing from a speaker cone.
  aloud: 'M4 9h4l5-4v14l-5-4H4zM17 9c1.2 1.6 1.2 4.4 0 6M20 6c2.2 3 2.2 9 0 12',
  camera: 'M3 7h4l2-2h6l2 2h4v13H3zM12 17a4 4 0 100-8 4 4 0 000 8z',
  // A pharmacy bill with a torn foot.
  bill: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  // Typed in by hand.
  keyed: 'M3 7h18v10H3zM7 11h1M11 11h1M15 11h1M8 14h8',
  members: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20v-2a4 4 0 014-4h4a4 4 0 014 4v2M17 6.5a3 3 0 010 5.8M18 14h1a4 4 0 014 4v2',
  next: 'M9 5l7 7-7 7',
  source: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  close: 'M5 5l14 14M19 5L5 19',
};

export interface IconProps {
  name: IconName;
  size?: number;
}

/** One drawn set, one stroke weight, square caps — ruled like the register itself. */
export function Icon({ name, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
