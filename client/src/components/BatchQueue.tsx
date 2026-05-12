import { useState } from 'react';
import type { CampaignFormData, ReelTemplate } from '../types';

function templateLabel(t: ReelTemplate): string {
  if (t === 'just-listed') return 'Just Listed';
  if (t === 'open-house')  return 'Open House';
  if (t === 'just-sold')   return 'Just Sold';
  return t;
}

function templateColor(t: ReelTemplate): string {
  if (t === 'just-listed') return 'bg-emerald-950 text-emerald-300 border-emerald-800';
  if (t === 'open-house')  return 'bg-blue-950 text-blue-300 border-blue-800';
  if (t === 'just-sold')   return 'bg-purple-950 text-purple-300 border-purple-800';
  return 'bg-neutral-800 text-neutral-300 border-neutral-700';
}

interface Props {
  queue: CampaignFormData[];
  onRemove: (i: number) => void;
  onDuplicate: (i: number) => void;
  onRenderAll: () => void;
  onGoToForm: () => void;
}

export default function BatchQueue({ queue, onRemove, onDuplicate, onRenderAll, onGoToForm }: Props) {
  const totalFiles = queue.reduce((n, c) => n + c.templates.length, 0);
  const [confirming, setConfirming] = useState(false);

  function handleRenderAll() {
    if (!confirming) { setConfirming(true); return; }
    setConfirming(false);
    onRenderAll();
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-600 gap-4">
        <p className="text-4xl">📋</p>
        <p className="text-lg font-medium text-neutral-400">Queue is empty</p>
        <p className="text-sm">Use <strong className="text-neutral-300">Add to Queue</strong> on the form to stage listings for batch rendering.</p>
        <button
          onClick={onGoToForm}
          className="mt-2 text-white hover:underline text-sm"
        >
          Go to New Listing →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Batch Queue</h1>
          <p className="text-neutral-400 text-sm">
            {queue.length} listing{queue.length !== 1 ? 's' : ''} — {totalFiles} file{totalFiles !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={handleRenderAll}
          className={`font-bold px-6 py-2.5 rounded-lg transition-colors text-sm tracking-wide
            ${confirming
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
              : 'bg-white hover:bg-neutral-200 text-black'}`}
        >
          {confirming ? `CONFIRM — ${totalFiles} FILE${totalFiles !== 1 ? 'S' : ''}?` : `RENDER ALL (${queue.length})`}
        </button>
      </div>

      <div className="space-y-3">
        {queue.map((campaign, i) => {
          const fileCount = campaign.templates.length;
          return (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-400 flex-shrink-0 mt-0.5">
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{campaign.folder}</p>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {[campaign.propertyAddress, campaign.city, campaign.state].filter(Boolean).join(', ')}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                  {campaign.templates.map(t => (
                    <span key={t} className={`text-xs px-2 py-0.5 rounded border font-medium ${templateColor(t)}`}>
                      {templateLabel(t)}
                    </span>
                  ))}
                </div>

                <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                  {campaign.listingPrice && (
                    <span>Price: <span className="text-neutral-300">{campaign.listingPrice}</span></span>
                  )}
                  <span>Duration: <span className="text-neutral-300">{campaign.duration}s</span></span>
                  {campaign.photos.length > 0 && (
                    <span>Photos: <span className="text-neutral-300">{campaign.photos.length}</span></span>
                  )}
                </div>

                {campaign.agentName && (
                  <p className="mt-2 text-xs text-neutral-600 truncate">
                    {campaign.agentName}{campaign.brokerageName ? ` · ${campaign.brokerageName}` : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="text-xs text-neutral-500">
                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => onDuplicate(i)}
                  className="text-xs text-neutral-500 hover:text-white transition-colors"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => onRemove(i)}
                  className="text-xs text-neutral-600 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 pb-8">
        <button onClick={onGoToForm} className="text-sm text-neutral-500 hover:text-white transition-colors">
          ← Add another listing
        </button>
        <button
          onClick={handleRenderAll}
          className={`font-bold px-8 py-3 rounded-lg transition-colors text-sm tracking-wide
            ${confirming
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
              : 'bg-white hover:bg-neutral-200 text-black'}`}
        >
          {confirming ? `CONFIRM — ${totalFiles} FILE${totalFiles !== 1 ? 'S' : ''}?` : `RENDER ALL — ${totalFiles} FILE${totalFiles !== 1 ? 'S' : ''}`}
        </button>
      </div>
    </div>
  );
}
