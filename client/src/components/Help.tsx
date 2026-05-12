import { useState } from 'react';

interface SectionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, open, onToggle, children }: SectionProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-800/40 transition-colors"
      >
        <span className="font-semibold text-white text-sm">{title}</span>
        <span className="text-neutral-500 text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-neutral-800">{children}</div>}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-400 leading-relaxed mb-3 last:mb-0">{children}</p>;
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 mt-4 first:mt-0">{children}</h3>;
}

function Term({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <span className="text-white text-sm font-medium">{term}</span>
      <p className="text-neutral-500 text-sm mt-0.5 leading-relaxed">{children}</p>
    </div>
  );
}

const FAQ = [
  {
    q: 'Why is my rendered video black or blank?',
    a: 'Make sure you uploaded at least one listing photo before hitting Render. Confirm your Assets Root in Settings points to the right folder.',
  },
  {
    q: 'What\'s the difference between Just Listed, Open House, and Just Sold?',
    a: 'Just Listed introduces a new property. Open House adds the date and time as the hero of the reel. Just Sold celebrates a closed deal and pivots to a "what\'s your home worth" CTA.',
  },
  {
    q: 'How many photos should I upload?',
    a: 'Four to eight strong photos works best for an 18-second reel. The first photo is treated as the hero shot. Order matters — earlier photos appear earlier in the video.',
  },
  {
    q: 'What aspect ratio do the videos render at?',
    a: 'All videos render at 1080×1920 (9:16 vertical), optimized for Instagram Reels, TikTok, and YouTube Shorts. Square (1:1) and horizontal (16:9) outputs are planned for a later release.',
  },
  {
    q: 'My render says "Failed" immediately — what happened?',
    a: 'Check the Render Videos log for the exact error. Common causes: Remotion project path wrong (fix in Settings), Node or npm not installed, or a file path typo. The ↺ Retry button re-submits the exact same job.',
  },
  {
    q: 'How do I change the Remotion project path after initial setup?',
    a: 'Go to the Settings tab and update the paths — no need to edit .env or restart the server.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-neutral-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-4 py-3 text-left"
      >
        <span className="text-sm text-neutral-200">{q}</span>
        <span className="text-neutral-600 flex-shrink-0 text-base leading-tight mt-0.5">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="text-sm text-neutral-500 leading-relaxed pb-3">{a}</p>}
    </div>
  );
}

export default function Help() {
  const [open, setOpen] = useState<string>('workflow');

  function toggle(id: string) {
    setOpen(o => o === id ? '' : id);
  }

  return (
    <div className="max-w-2xl space-y-3">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Help</h1>
        <p className="text-neutral-400 text-sm">Everything you need to know about Real Estate Reels Web.</p>
      </div>

      <Section id="workflow" title="🚀 Getting Started" open={open === 'workflow'} onToggle={() => toggle('workflow')}>
        <P>Real Estate Reels Web is a local web app that turns listing photos into branded short-form videos for real estate marketing. The usual workflow:</P>
        <ol className="space-y-3 mt-3">
          {[
            ['1. Create or select a listing', 'Each listing gets its own folder. Use "New Listing" with a name like "123 Magnolia Lane", then click "Create Folder".'],
            ['2. Fill in the listing details', 'Property address, price, beds, baths, square feet, plus agent and brokerage info.'],
            ['3. Upload listing photos', 'Drop in 4–8 strong photos. The first photo is treated as the hero shot. Optionally add an agent headshot and brokerage logo.'],
            ['4. Choose a video template', 'Pick Just Listed, Open House, or Just Sold — or all three. Each selected template produces one rendered video.'],
            ['5. Render and download', 'Hit RENDER NOW or "Add to Queue" to batch multiple listings. Finished videos appear in the Output Gallery.'],
          ].map(([step, desc]) => (
            <li key={step} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{step}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="templates" title="🎬 Video Templates" open={open === 'templates'} onToggle={() => toggle('templates')}>
        <div className="space-y-4">
          <div>
            <H>Just Listed</H>
            <P>The classic "new on the market" intro. Big "JUST LISTED" hook → hero photo with address → beds/baths/sqft card → photo montage → agent CTA.</P>
          </div>
          <div>
            <H>Open House</H>
            <P>Designed around the open-house date and time. Leads with date/time, walks through the property, and closes on "Come to the Open House."</P>
          </div>
          <div>
            <H>Just Sold</H>
            <P>Celebrates a closed listing. Ends with a "What's your home worth?" CTA to drive seller leads from your social audience.</P>
          </div>
          <P>Each template is a separate Remotion composition. Selecting all three renders three videos.</P>
        </div>
      </Section>

      <Section id="assets" title="📸 Photos & Branding" open={open === 'assets'} onToggle={() => toggle('assets')}>
        <H>Listing photos</H>
        <P>JPG or PNG. Horizontal photos look best — the renderer crops them into the 9:16 frame intelligently, so wide shots fill the screen better than tall ones.</P>
        <H>Agent headshot</H>
        <P>Optional. A clean, square headshot reads best — it appears in the closing card alongside your name and CTA.</P>
        <H>Brokerage logo</H>
        <P>Optional. A transparent PNG works best; coloured backgrounds tend to clash with the property photos.</P>
        <H>Background music</H>
        <P>Optional. WAV, MP3, M4A. Keep it instrumental — vocals fight with the on-screen text.</P>
      </Section>

      <Section id="glossary" title="📖 Field Glossary" open={open === 'glossary'} onToggle={() => toggle('glossary')}>
        <div className="space-y-1 divide-y divide-neutral-800/60">
          <Term term="Property Address">Street address only — city and state are separate fields. Appears as the headline overlay on the hero shot.</Term>
          <Term term="Listing Price">Free-form text — you control formatting. e.g. "$1,250,000" or "Offered at $1.25M".</Term>
          <Term term="Beds / Baths / Sq Ft">Numbers or short text. Rendered as a three-stat card in the middle of the reel.</Term>
          <Term term="Agent Name / Phone / Email">Appears in the closing card. Save these as an Agent Profile once and reuse across listings.</Term>
          <Term term="CTA Text">The call-to-action shown in the final card. Pick a preset or write your own.</Term>
          <Term term="Open House Date / Time">Only shown in the Open House template — leave blank for Just Listed / Just Sold.</Term>
          <Term term="Short Description">Optional one-liner highlight (e.g. "Hill-country light, chef's kitchen"). Used as an overlay caption.</Term>
          <Term term="MLS Link">Optional. Not currently rendered into the video, but stored with the listing for reference.</Term>
          <Term term="Assets Root">The top-level folder where all your listing folders live. Configured in Settings.</Term>
          <Term term="Remotion Project">The path to the Remotion source folder. Configured in Settings.</Term>
          <Term term="Batch Queue">A holding area for multiple listings. Stage several listings, then render them all at once from the Queue tab.</Term>
        </div>
      </Section>

      <Section id="faq" title="❓ FAQ" open={open === 'faq'} onToggle={() => toggle('faq')}>
        <div>
          {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
        </div>
      </Section>

      <div className="pb-10" />
    </div>
  );
}
