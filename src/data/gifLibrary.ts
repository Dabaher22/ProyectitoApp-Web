// GIFs descargados y comprimidos — servidos desde Firebase Hosting

export interface GifEntry {
  id: string;
  muscle: string;
  url: string;
}

const make = (muscle: string, count: number): GifEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${muscle}_${String(i).padStart(2, '0')}`,
    muscle,
    url: `/gifs/${muscle}_${String(i).padStart(2, '0')}.gif`,
  }));

export const GIF_LIBRARY: GifEntry[] = [
  ...make('PECHO', 49),
  ...make('ESPALDA', 52),
  ...make('HOMBROS', 48),
  ...make('BICEPS', 22),
  ...make('TRICEPS', 38),
  ...make('CORE', 93),
  ...make('PIERNAS', 70),
  ...make('GLUTEOS', 16),
];

export const GIF_MUSCLES: string[] = [
  'PECHO',
  'ESPALDA',
  'HOMBROS',
  'BICEPS',
  'TRICEPS',
  'CORE',
  'PIERNAS',
  'GLUTEOS',
];
