/**
 * Model Training Pipeline, Model Library, and Shipped Products/APIs drawer.
 */

import { useState } from 'react';
import { DATASET_BY_ID } from '../data/datasets';
import { getUnlockedArchitectures } from '../sim/training';
import { useGameStore, useResourceSnapshot } from '../store/useGameStore';

export function ModelsDrawer() {
  const [subTab, setSubTab] = useState<'train' | 'library' | 'products'>('train');
  const game = useGameStore((s) => s.game);
  const res = useResourceSnapshot();
  const startTraining = useGameStore((s) => s.startTraining);
  const shipModel = useGameStore((s) => s.shipModel);
  const toggleAutomation = useGameStore((s) => s.toggleAutomation);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);

  const archs = getUnlockedArchitectures(game);
  const [selectedArchId, setSelectedArchId] = useState<string>(
    archs[archs.length - 1]?.id ?? 'arch_convnet',
  );
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    game.ownedDatasets[game.ownedDatasets.length - 1] ?? 'ds_academic_vision',
  );
  const [customName, setCustomName] = useState('');

  const activeArch = archs.find((a) => a.id === selectedArchId) ?? archs[0];
  const minCompute = activeArch?.computeReq ?? 10;
  const maxAlloc = Math.max(minCompute, res.computeAvailable);
  const [computeAlloc, setComputeAlloc] = useState<number>(Math.max(minCompute, Math.min(maxAlloc, 40)));
  const clampedAlloc = Math.min(maxAlloc, Math.max(minCompute, computeAlloc));

  const autoQueueUnlocked = game.unlockedTechs.includes('tech_auto_queue');
  const canLaunch =
    Boolean(activeArch) &&
    res.computeAvailable >= minCompute &&
    game.trainingJobs.length < 2;

  return (
    <section
      aria-label="Models and training"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] [@media(max-height:500px)]:bottom-[68px] left-1/2 -translate-x-1/2 z-20 w-[min(900px,96vw)] max-h-[calc(100dvh-180px)] [@media(max-height:500px)]:max-h-[calc(100dvh-126px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3 [@media(max-height:500px)]:p-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-[#2e344b]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('train')}
            className={`px-3 py-1 text-xs font-pixel-display ${
              subTab === 'train' ? 'pixel-btn-gold' : 'pixel-btn'
            }`}
          >
            Train ({game.trainingJobs.length}/2)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('library')}
            className={`px-3 py-1 text-xs font-pixel-display ${
              subTab === 'library' ? 'pixel-btn-gold' : 'pixel-btn'
            }`}
          >
            Model Library ({game.models.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('products')}
            className={`px-3 py-1 text-xs font-pixel-display ${
              subTab === 'products' ? 'pixel-btn-gold' : 'pixel-btn'
            }`}
          >
            Products & APIs ({game.products.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {autoQueueUnlocked && (
            <button
              type="button"
              onClick={() => toggleAutomation('autoQueueTraining')}
              className={`px-2.5 py-1 text-xs font-pixel-display ${
                game.automation.autoQueueTraining ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              Auto-Queue: {game.automation.autoQueueTraining ? 'ON' : 'OFF'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveDrawer(null)}
            aria-label="Close models menu"
            className="px-2 py-1 text-xs font-pixel-display pixel-btn"
          >
            X
          </button>
        </div>
      </div>

      {subTab === 'train' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* New Training Run Form */}
          <div className="pixel-inset p-3 space-y-2.5">
            <div className="font-pixel-display text-xs text-[#ffe478]">
              Configure Training Run
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-[#b8c0cf]">
                Architecture
                <select
                  value={activeArch?.id ?? ''}
                  onChange={(e) => setSelectedArchId(e.target.value)}
                  className="mt-1 w-full bg-[#1f2233] border-2 border-[#45506b] px-2 py-1 text-xs text-[#faf7eb]"
                >
                  {archs.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.computeReq}+ TF)
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs text-[#b8c0cf]">
                Dataset
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="mt-1 w-full bg-[#1f2233] border-2 border-[#45506b] px-2 py-1 text-xs text-[#faf7eb]"
                >
                  {game.ownedDatasets.map((id) => {
                    const ds = DATASET_BY_ID[id];
                    return (
                      <option key={id} value={id}>
                        {ds?.name ?? id} (Q{ds?.quality ?? 0})
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 items-end">
              <label className="block text-xs text-[#b8c0cf]">
                Compute Budget: <span className="text-[#8de4ff] tabular-nums">{clampedAlloc} / {res.computeAvailable} TF</span>
                <input
                  type="range"
                  min={minCompute}
                  max={Math.max(minCompute, res.computeAvailable)}
                  value={clampedAlloc}
                  onChange={(e) => setComputeAlloc(Number(e.target.value))}
                  className="mt-1 w-full accent-[#e6b84c]"
                />
              </label>

              <label className="block text-xs text-[#b8c0cf]">
                Model Name (optional)
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. ProtoNet-1"
                  maxLength={24}
                  className="mt-1 w-full bg-[#1f2233] border-2 border-[#45506b] px-2 py-1 text-xs text-[#faf7eb]"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#b8c0cf]">
                {res.computeAvailable < minCompute
                  ? `Need ${minCompute - res.computeAvailable} more free TF`
                  : `Est. duration: ~${activeArch?.trainingDays ?? 12} game days`}
              </span>
              <button
                type="button"
                disabled={!canLaunch}
                onClick={() => {
                  const ok = startTraining(
                    activeArch.id,
                    selectedDatasetId,
                    clampedAlloc,
                    customName,
                  );
                  if (ok) setCustomName('');
                }}
                className="pixel-btn-green px-4 py-1.5 text-xs font-pixel-display"
              >
                Start Training
              </button>
            </div>
          </div>

          {/* Active Training Jobs */}
          <div className="pixel-inset p-3">
            <div className="font-pixel-display text-xs text-[#8de4ff] mb-2">
              Active Training Runs
            </div>
            {game.trainingJobs.length === 0 ? (
              <p className="text-xs text-[#8c96ab] py-6 text-center">
                No training jobs running. Allocate GPUs on the left to train a new model!
              </p>
            ) : (
              <div className="space-y-2.5">
                {game.trainingJobs.map((job) => {
                  const pct = Math.round(job.progress * 100);
                  return (
                    <div key={job.id} className="bg-[#1f2233] border-2 border-[#2e344b] p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-pixel-display text-[#faf7eb]">
                          {job.modelName}
                        </span>
                        <span className="font-pixel-display text-[#8ce063] tabular-nums">
                          {pct}%
                        </span>
                      </div>
                      <div className="text-[11px] text-[#b8c0cf] mt-0.5">
                        {job.archName} · {job.computeAllocated} TF allocated
                      </div>
                      <div className="mt-1.5 h-3 bg-[#14121d] border border-[#45506b]">
                        <div
                          className="h-full bg-[#4da858]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'library' && (
        <div className="space-y-2 max-h-[250px] overflow-y-auto pixel-scroll pr-1">
          {game.models.length === 0 ? (
            <p className="text-xs text-[#8c96ab] text-center py-6">
              No models trained yet. Complete a training run to unlock benchmarks and ship APIs.
            </p>
          ) : (
            game.models.map((m) => (
              <div
                key={m.id}
                className="pixel-inset p-2.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel-display text-xs text-[#ffe478]">
                      {m.name}
                    </span>
                    <span className="text-xs text-[#b8c0cf]">
                      {m.archName} · {m.completedYear}
                    </span>
                  </div>
                  <div className="text-xs text-[#8de4ff] tabular-nums mt-0.5">
                    Overall {m.benchmarks.overall}/100 · Reason {m.benchmarks.reasoning} · Code {m.benchmarks.coding} · Multi {m.benchmarks.multimodal} · Safety {m.benchmarks.safety}
                  </div>
                </div>
                {m.shipped ? (
                  <span className="font-pixel-display text-xs text-[#8ce063]">
                    Live API
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => shipModel(m.id)}
                    className="pixel-btn-gold px-3 py-1.5 text-xs font-pixel-display"
                  >
                    Ship Product / API
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {subTab === 'products' && (
        <div className="space-y-2 max-h-[250px] overflow-y-auto pixel-scroll pr-1">
          {game.products.length === 0 ? (
            <p className="text-xs text-[#8c96ab] text-center py-6">
              No live APIs shipped yet. Train a model and click &ldquo;Ship Product / API&rdquo; in Model Library.
            </p>
          ) : (
            game.products.map((p) => (
              <div
                key={p.id}
                className="pixel-inset p-2.5 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-pixel-display text-xs text-[#faf7eb]">
                    {p.name}
                  </div>
                  <div className="text-xs text-[#b8c0cf] tabular-nums">
                    Quality {p.quality}/100 · {p.users.toLocaleString()} active users
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-pixel-display text-xs text-[#8ce063]">
                    +${Math.round(p.revenuePerDay).toLocaleString()}/day
                  </div>
                  <div className="text-[11px] text-[#8c96ab]">
                    Demand {Math.round(p.decayFactor * 100)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
