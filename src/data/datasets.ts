/**
 * Data-driven datasets catalog for model training.
 */

export interface DatasetDefinition {
  id: string;
  name: string;
  sizeTB: number;
  quality: number; // 1 - 100
  legalityRisk: number; // 0 (clean) to 45 (high risk of audit/leak)
  cost: number;
  unlockEra: number;
  category: 'vision' | 'language' | 'code' | 'multimodal' | 'reasoning';
  description: string;
}

export const DATASETS: DatasetDefinition[] = [
  {
    id: 'ds_academic_vision',
    name: 'OpenBench Vision 1M',
    sizeTB: 2,
    quality: 38,
    legalityRisk: 0,
    cost: 0,
    unlockEra: 0,
    category: 'vision',
    description: 'Public academic image labels. Free and completely safe to train on.',
  },
  {
    id: 'ds_web_crawl',
    name: 'Raw Web Crawl v1',
    sizeTB: 24,
    quality: 52,
    legalityRisk: 22,
    cost: 4_500,
    unlockEra: 0,
    category: 'language',
    description: 'Noisy broad internet snapshot. Cheap scale, moderate licensing risk.',
  },
  {
    id: 'ds_curated_books',
    name: 'Curated Library Corpus',
    sizeTB: 18,
    quality: 68,
    legalityRisk: 8,
    cost: 18_000,
    unlockEra: 1,
    category: 'language',
    description: 'Licensed textbooks, encyclopedias, and clean technical prose.',
  },
  {
    id: 'ds_permissive_code',
    name: 'Permissive Code Vault',
    sizeTB: 42,
    quality: 78,
    legalityRisk: 4,
    cost: 42_000,
    unlockEra: 2,
    category: 'code',
    description: 'Audited open-licensed repositories with unit-test verification.',
  },
  {
    id: 'ds_multimodal_media',
    name: 'Studio Multimodal Archive',
    sizeTB: 180,
    quality: 88,
    legalityRisk: 10,
    cost: 115_000,
    unlockEra: 3,
    category: 'multimodal',
    description: 'Synchronized high-res video, audio transcripts, and diagrams.',
  },
  {
    id: 'ds_synthetic_reasoning',
    name: 'Synthetic Proof Traces',
    sizeTB: 95,
    quality: 96,
    legalityRisk: 0,
    cost: 240_000,
    unlockEra: 4,
    category: 'reasoning',
    description: 'Formally verified math, science, and software synthesis chains.',
  },
];

export const DATASET_BY_ID: Record<string, DatasetDefinition> = Object.fromEntries(
  DATASETS.map((d) => [d.id, d]),
);
