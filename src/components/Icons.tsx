type P = { size?: number }
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const HomeIcon = ({ size = 20 }: P) => <svg {...base(size)}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
export const HeartIcon = ({ size = 20 }: P) => <svg {...base(size)}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>
export const FlameIcon = ({ size = 20 }: P) => <svg {...base(size)}><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 2 3 1-2 1-4 1-7z" /></svg>
export const SparkIcon = ({ size = 20 }: P) => <svg {...base(size)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></svg>
export const CalendarIcon = ({ size = 20 }: P) => <svg {...base(size)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
export const ArrowIcon = ({ size = 20 }: P) => <svg {...base(size)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
export const BackIcon = ({ size = 20 }: P) => <svg {...base(size)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
export const XIcon = ({ size = 16 }: P) => <svg {...base(size)}><path d="M6 6l12 12M18 6L6 18" /></svg>
export const UploadIcon = ({ size = 18 }: P) => <svg {...base(size)}><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
export const PlayIcon = ({ size = 26 }: P) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
