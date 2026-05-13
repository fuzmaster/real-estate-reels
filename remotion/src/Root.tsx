import React from 'react';
import { Composition } from 'remotion';

import { ListingReel } from './ListingReel';

import {
  PROJECT_FOLDER,
  LISTING_PHOTOS,
  PHOTO_SETTINGS,
  AGENT_HEADSHOT_FILE,
  BROKERAGE_LOGO_FILE,
  BACKGROUND_MUSIC_FILE,
  PROPERTY_ADDRESS,
  CITY,
  STATE,
  LISTING_PRICE,
  BEDS,
  BATHS,
  SQUARE_FEET,
  AGENT_NAME,
  AGENT_PHONE,
  AGENT_EMAIL,
  BROKERAGE_NAME,
  CTA_TEXT,
  OPEN_HOUSE_DATE,
  OPEN_HOUSE_TIME,
  SHORT_DESCRIPTION,
  NEIGHBORHOOD,
  MLS_LINK,
  QR_CODE_DATA_URL,
  CLIP_DURATION_SECONDS,
  VIDEO_STYLE,
  PACING,
  MUSIC_MOOD,
  PHOTO_TRANSITION,
  AUTO_ENHANCE,
  SMART_SAFE_ZONES,
  PERSISTENT_BRANDING,
  PROGRESS_BAR,
} from './campaign.config';

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const sharedProps = {
  projectFolder: PROJECT_FOLDER,
  photos: LISTING_PHOTOS,
  photoSettings: PHOTO_SETTINGS,
  headshotFile: AGENT_HEADSHOT_FILE,
  logoFile: BROKERAGE_LOGO_FILE,
  musicFile: BACKGROUND_MUSIC_FILE,
  propertyAddress: PROPERTY_ADDRESS,
  city: CITY,
  state: STATE,
  listingPrice: LISTING_PRICE,
  beds: BEDS,
  baths: BATHS,
  squareFeet: SQUARE_FEET,
  agentName: AGENT_NAME,
  agentPhone: AGENT_PHONE,
  agentEmail: AGENT_EMAIL,
  brokerageName: BROKERAGE_NAME,
  ctaText: CTA_TEXT,
  openHouseDate: OPEN_HOUSE_DATE,
  openHouseTime: OPEN_HOUSE_TIME,
  shortDescription: SHORT_DESCRIPTION,
  neighborhood: NEIGHBORHOOD,
  mlsLink: MLS_LINK,
  qrCodeDataUrl: QR_CODE_DATA_URL,
  videoStyle: VIDEO_STYLE,
  pacing: PACING,
  musicMood: MUSIC_MOOD,
  photoTransition: PHOTO_TRANSITION,
  autoEnhance: AUTO_ENHANCE,
  smartSafeZones: SMART_SAFE_ZONES,
  persistentBranding: PERSISTENT_BRANDING,
  progressBar: PROGRESS_BAR,
} as const;

export const RemotionRoot: React.FC = () => {
  const durationInFrames = Math.max(1, Math.round(CLIP_DURATION_SECONDS * FPS));

  return (
    <>
      <Composition
        id="JustListed"
        component={ListingReel}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ ...sharedProps, mode: 'just-listed' as const }}
      />
      <Composition
        id="OpenHouse"
        component={ListingReel}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ ...sharedProps, mode: 'open-house' as const }}
      />
      <Composition
        id="JustSold"
        component={ListingReel}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ ...sharedProps, mode: 'just-sold' as const }}
      />
    </>
  );
};
