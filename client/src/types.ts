// Real Estate Reels — form & API types.

import type { PhotoFraming } from './utils/photoFraming';

export type ReelTemplate = 'just-listed' | 'open-house' | 'just-sold';

export type PhotoTransitionPreset =
  | 'smart-mix'
  | 'soft-fade'
  | 'slide-left'
  | 'slide-up'
  | 'zoom-pop'
  | 'whip-pan'
  | 'flash-cut'
  | 'none';

export type PhotoTransition =
  | 'smart-mix'
  | 'soft-fade'
  | 'slide-left'
  | 'slide-up'
  | 'zoom-pop'
  | 'whip-pan'
  | 'flash-cut'
  | 'none';

export type VideoStyle = 'social-punchy' | 'luxury-cinematic' | 'brokerage-clean';
export type PacingPreset = 'fast' | 'balanced' | 'cinematic';
export type MusicMood =
  | 'warm-inviting'
  | 'modern-lofi'
  | 'luxury-cinematic'
  | 'upbeat-open-house'
  | 'corporate-professional'
  | 'urgent-driving'
  | 'high-energy-social';

export interface ListingAssets {
  photos: string[];        // relative paths under Photos/
  headshot: string | null; // relative path under Headshot/, or null
  logo: string | null;     // relative path under Logo/, or null
  music: string | null;    // relative path under Music/, or null
}

export interface ProjectSummary {
  name: string;
  photos: number;
  outputs: number;
  updatedAt: string;
}

export interface BrandLibrary {
  headshots: Array<{ file: string; label: string }>;
  logos: Array<{ file: string; label: string }>;
  music: Array<{ file: string; label: string }>;
}

export interface CampaignFormData {
  // Folder under Projects/ on disk. Keeps server contract.
  folder: string;

  // Template selection — one or more.
  templates: ReelTemplate[];

  // Listing details (required)
  propertyAddress: string;
  city: string;
  state: string;
  listingPrice: string;   // free-form string, e.g. "$1,250,000"
  beds: string;
  baths: string;
  squareFeet: string;

  // Agent / brokerage (required)
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  brokerageName: string;

  // CTA
  ctaText: string;

  // Optional listing details
  openHouseDate: string;
  openHouseTime: string;
  shortDescription: string;
  neighborhood: string;
  mlsLink: string;

  // Asset paths (relative inside the listing folder)
  photos: string[];
  headshot: string;       // empty string when absent
  logo: string;           // empty string when absent
  music: string;          // empty string when absent

  // Per-photo framing settings keyed by each relative photo path.
  photoFraming: Record<string, PhotoFraming>;

  // Output config
  duration: number;       // seconds per reel
  useSmartDuration?: boolean; // true when the app auto-calculates reel length from photo count
  recommendedDuration?: number; // seconds suggested by Smart Duration
  videoStyle: VideoStyle;
  pacing: PacingPreset;
  musicMood: MusicMood;
  photoTransition: PhotoTransition;
  safeZones: boolean;
  autoEnhance: boolean;
  persistentBranding: boolean;
  progressBar: boolean;
}

export interface RenderJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  campaign: string;
  startTime: number;
  error?: string;
}

export interface OutputFile {
  name: string;
  size: number;
  mtime: string;
}

export interface OutputCampaign {
  slug: string;
  files: OutputFile[];
  package?: {
    propertyLabel: string;
    caption: string;
    postingTitle: string;
    hashtags: string[];
    mlsLink?: string;
  };
}
