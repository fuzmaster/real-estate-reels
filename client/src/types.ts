// Real Estate Reels — form & API types.

export type ReelTemplate = 'just-listed' | 'open-house' | 'just-sold';

export interface ListingAssets {
  photos: string[];        // relative paths under Photos/
  headshot: string | null; // relative path under Headshot/, or null
  logo: string | null;     // relative path under Logo/, or null
  music: string | null;    // relative path under Music/, or null
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

  // Output config
  duration: number;       // seconds per reel
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
}
