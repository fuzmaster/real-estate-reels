export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-[Montserrat,sans-serif]">

      {/* Nav */}
      <nav className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">REAL ESTATE</span>
            <span className="text-lg font-bold tracking-tight text-neutral-400">REELS</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="text-sm text-neutral-400 hover:text-white transition-colors hidden sm:block">Pricing</a>
            <a
              href="/app"
              className="bg-[#D4AF37] hover:bg-yellow-400 text-black text-sm font-bold px-4 py-1.5 rounded-full transition-colors"
            >
              Launch App
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-widest">
          Built for Real Estate Agents
        </div>
        <h1 className="text-5xl sm:text-6xl font-black leading-[1.05] mb-6 tracking-tight">
          Listing videos that get<br />
          <span className="text-[#D4AF37]">attention. In minutes.</span>
        </h1>
        <p className="text-neutral-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Turn your listing photos into polished short-form videos for Instagram Reels, TikTok,
          and YouTube Shorts — without hiring an editor. Just Listed, Open House, and Just Sold
          templates ready to go.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/app"
            className="bg-[#D4AF37] hover:bg-yellow-400 text-black font-bold px-8 py-3.5 rounded-full text-base transition-colors w-full sm:w-auto text-center"
          >
            Create Your First Reel — Free
          </a>
          <a
            href="#how-it-works"
            className="text-neutral-400 hover:text-white text-sm font-medium transition-colors"
          >
            See how it works ↓
          </a>
        </div>
        <p className="text-neutral-600 text-xs mt-6">No account required to start. 3 free renders per month.</p>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-neutral-800 bg-neutral-900/40 py-5">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-neutral-500 text-sm font-medium">
          <span>9:16 vertical for Instagram & TikTok</span>
          <span className="text-neutral-700 hidden sm:block">•</span>
          <span>Just Listed · Open House · Just Sold</span>
          <span className="text-neutral-700 hidden sm:block">•</span>
          <span>Rendered locally — your photos never leave your machine</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-black text-center mb-3">How it works</h2>
        <p className="text-neutral-400 text-center mb-14 text-sm">From listing photos to ready-to-post video in three steps.</p>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Upload your listing photos',
              body: 'Drop in your MLS photos, agent headshot, and brokerage logo. Everything stays on your machine.',
            },
            {
              step: '02',
              title: 'Fill in the listing details',
              body: 'Address, price, beds, baths, agent info, and your CTA. Pick Just Listed, Open House, or Just Sold.',
            },
            {
              step: '03',
              title: 'Render and download',
              body: 'Hit render. A branded 1080×1920 MP4 is ready to post on Instagram, TikTok, or YouTube Shorts.',
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-7">
              <div className="text-[#D4AF37] text-4xl font-black mb-4 leading-none">{step}</div>
              <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section className="bg-neutral-900/50 border-y border-neutral-800 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-3">Three templates. Every listing occasion.</h2>
          <p className="text-neutral-400 text-center mb-14 text-sm">
            Each template is optimized for a different moment in the listing lifecycle.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                label: 'Just Listed',
                accent: '#FFFFFF',
                badge: 'bg-white text-black',
                description: 'Launch a new listing with a hook slide, hero photo, property stats, and your agent CTA.',
                keywords: 'Perfect for new listings, price reductions, and back-on-market announcements.',
              },
              {
                label: 'Open House',
                accent: '#9DC8FF',
                badge: 'bg-blue-400 text-black',
                description: 'Promote your open house with date, time, and property highlights front and center.',
                keywords: 'Ideal for weekend open houses, broker tours, and virtual showing announcements.',
              },
              {
                label: 'Just Sold',
                accent: '#FFD27A',
                badge: 'bg-yellow-300 text-black',
                description: 'Celebrate a closed deal, reinforce your market presence, and generate referral leads.',
                keywords: 'Great for seller testimonials, neighborhood sold reports, and agent farming.',
              },
            ].map(({ label, badge, description, keywords }) => (
              <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-7 flex flex-col gap-4">
                <span className={`self-start text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${badge}`}>
                  {label}
                </span>
                <p className="text-neutral-300 text-sm leading-relaxed">{description}</p>
                <p className="text-neutral-600 text-xs leading-relaxed">{keywords}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features list */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-black text-center mb-3">Everything agents actually need</h2>
        <p className="text-neutral-400 text-center mb-14 text-sm">No Premiere Pro. No editor. No waiting.</p>
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {[
            ['Branded agent headshot + brokerage logo on every video', true],
            ['Ken Burns zoom effect on listing photos', true],
            ['Background music track support', true],
            ['Property stats card (beds, baths, sq ft)', true],
            ['Custom call-to-action text', true],
            ['Batch queue — prep many listings, render all at once', true],
            ['Live render progress and logs', true],
            ['Output gallery with inline preview and download', true],
            ['1080×1920 MP4 — Instagram, TikTok, YouTube Shorts ready', true],
            ['Renders locally — your media never leaves your machine', true],
          ].map(([label]) => (
            <div key={label as string} className="flex items-start gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
              <span className="text-[#D4AF37] flex-shrink-0 mt-0.5">✓</span>
              <span className="text-sm text-neutral-300">{label as string}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-neutral-900/50 border-y border-neutral-800 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-3">Simple pricing</h2>
          <p className="text-neutral-400 text-center mb-14 text-sm">Start free. Upgrade when you're posting more.</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col">
              <div className="text-neutral-400 text-sm font-bold uppercase tracking-widest mb-4">Free</div>
              <div className="text-5xl font-black mb-1">$0</div>
              <div className="text-neutral-600 text-sm mb-8">per month</div>
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  '3 renders per month',
                  'Just Listed template',
                  '9:16 vertical only',
                  '1 saved agent profile',
                  'Watermark on output',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                    <span className="text-neutral-600 flex-shrink-0">–</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/app" className="block text-center bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Start Free
              </a>
            </div>

            {/* Pro */}
            <div className="bg-neutral-900 border border-[#D4AF37]/40 rounded-2xl p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <div className="text-[#D4AF37] text-sm font-bold uppercase tracking-widest mb-4">Pro</div>
              <div className="text-5xl font-black mb-1">$29</div>
              <div className="text-neutral-600 text-sm mb-8">per agent / month</div>
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  'Unlimited renders',
                  'All 3 templates',
                  '9:16, 1:1, and 16:9 formats',
                  '5 saved agent profiles',
                  'No watermark',
                  'Custom music upload',
                  'Headshot + logo branding',
                  'Batch queue',
                  'Bulk ZIP download',
                  'QR code on outro slide',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-neutral-300">
                    <span className="text-[#D4AF37] flex-shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/app" className="block text-center bg-[#D4AF37] hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition-colors text-sm">
                Start Pro — $29/mo
              </a>
            </div>
          </div>

          {/* Brokerage teaser */}
          <div className="mt-6 max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-white font-bold text-sm mb-1">Brokerage / Team — $99/mo</div>
              <div className="text-neutral-500 text-xs">Multiple agents, shared brand kit, white-label, bulk render. Contact us for a demo.</div>
            </div>
            <a href="mailto:hello@realestatereels.app" className="flex-shrink-0 text-xs border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white px-4 py-2 rounded-lg transition-colors">
              Contact
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-black text-center mb-14">Frequently asked questions</h2>
        <div className="space-y-6">
          {[
            {
              q: 'Do I need to know video editing?',
              a: 'No. You fill out a form — address, price, photos, agent name — and the app renders a polished MP4. No timeline, no keyframes, no exports.',
            },
            {
              q: 'Where do my photos and videos go?',
              a: 'Rendering happens on your local machine. Your listing photos and client media never leave your computer or get uploaded to a third-party server.',
            },
            {
              q: 'What size video does it produce?',
              a: '1080×1920 pixels at 30fps — the native size for Instagram Reels, TikTok, and YouTube Shorts. Pro plans also include 1:1 square and 16:9 horizontal cuts.',
            },
            {
              q: 'Can I use my own music?',
              a: 'Yes. Upload any MP3 or audio file as the background track. Make sure you have the rights to use it on social media.',
            },
            {
              q: 'Can I save my agent info so I don\'t retype it every time?',
              a: 'Yes. Save up to 5 agent profiles (Pro) or 1 profile (Free) with your name, phone, brokerage, and logo. Load them in one click for each new listing.',
            },
            {
              q: 'Does this work for teams and brokerages?',
              a: 'The Brokerage plan ($99/mo) supports multiple agent seats, a shared brand kit, white-label output, and bulk rendering. Contact us for a demo.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-neutral-800 pb-6">
              <h3 className="text-white font-bold mb-2 text-sm">{q}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="border-t border-neutral-800 bg-neutral-900/40 py-20 text-center px-6">
        <h2 className="text-3xl sm:text-4xl font-black mb-4">Stop spending hours on listing videos.</h2>
        <p className="text-neutral-400 mb-8 text-sm max-w-lg mx-auto">
          Your next Just Listed reel is three steps and a few minutes away. Start free, no account required.
        </p>
        <a
          href="/app"
          className="inline-block bg-[#D4AF37] hover:bg-yellow-400 text-black font-bold px-10 py-4 rounded-full text-base transition-colors"
        >
          Create Your First Reel — Free
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-600 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-400">REAL ESTATE REELS</span>
            <span>— listing videos for agents, built with Remotion</span>
          </div>
          <div className="flex gap-6">
            <a href="/app" className="hover:text-neutral-400 transition-colors">Launch App</a>
            <a href="#pricing" className="hover:text-neutral-400 transition-colors">Pricing</a>
            <a href="mailto:hello@realestatereels.app" className="hover:text-neutral-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
