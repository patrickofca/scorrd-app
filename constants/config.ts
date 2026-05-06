// On iOS simulator: localhost works.
// On Android emulator: use 10.0.2.2 instead of localhost.
// On a physical device: use your Mac's local network IP (e.g. 192.168.x.x:3000).
// Set EXPO_PUBLIC_API_URL in a .env file at the project root to override.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'twitter', 'tiktok'] as const;
export type Platform = typeof PLATFORMS[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'X',
  tiktok: 'TikTok',
};

export const CONTENT_TYPES = [
  'new_listing',
  'sold',
  'open_house',
  'market_update',
  'tip',
  'testimonial',
  'other',
] as const;
export type ContentType = typeof CONTENT_TYPES[number];

export type PriceRange = string;

export const BUYER_TYPES = [
  'First-Time Buyer',
  'Move-Up Buyer',
  'Luxury Buyer',
  'Investor',
  'Downsizer',
  'Relocating',
] as const;
export type BuyerType = typeof BUYER_TYPES[number];

export const TONES = ['professional', 'warm', 'luxury', 'urgent', 'casual'] as const;
export type Tone = typeof TONES[number];
export const TONE_LABELS: Record<Tone, string> = {
  professional: 'Professional',
  warm: 'Warm',
  luxury: 'Luxury',
  urgent: 'Urgent',
  casual: 'Casual',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  new_listing: 'New Listing',
  sold: 'Just Sold',
  open_house: 'Open House',
  market_update: 'Market Update',
  tip: 'Agent Tip',
  testimonial: 'Testimonial',
  other: 'Other',
};

export const PLATFORM_OPTIMAL_TIMES: Record<string, string[]> = {
  instagram: ['Weekdays 9–11 AM', 'Tue–Thu 6–8 PM'],
  facebook: ['Weekdays 8–10 AM', 'Fri 12–3 PM'],
  linkedin: ['Tue–Thu 7–10 AM', 'Wed 12 PM'],
  twitter: ['Weekdays 8–10 AM', 'Weekdays 5–7 PM'],
  tiktok: ['Daily 9–11 AM', 'Daily 6–9 PM'],
};
