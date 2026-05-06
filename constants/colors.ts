export const Colors = {
  navy: '#1C2B3A',
  teal: '#0EA5A0',
  tealDark: '#0D7A76',
  offWhite: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceElevated: '#F0EEEB',
  border: '#E2E8F0',
  textPrimary: '#1C2B3A',
  textSecondary: '#64748B',
  scoreGreen: '#16A34A',
  scoreAmber: '#D97706',
  scoreRed: '#DC2626',
  error: '#DC2626',
} as const;

export function scoreColor(score: number): string {
  if (score >= 7.0) return Colors.scoreGreen;
  if (score >= 4.0) return Colors.scoreAmber;
  return Colors.scoreRed;
}
