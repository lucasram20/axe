/**
 * Data-driven Era definitions & Research / Tech Tree.
 *
 * Architected with `packId` and `startYear` sorting so an earlier historical pack
 * (e.g., "classic_1960_1999": Symbolic AI, Perceptrons, Expert Systems, SVMs)
 * can be dropped in as a pure data module with zero engine rewrites.
 */

export interface EraDefinition {
  index: number;
  id: string;
  packId: string;
  name: string;
  startYear: number;
  tagline: string;
  accentColor: string;
  benchmarkCeiling: number;
}

export interface TechNode {
  id: string;
  eraIndex: number;
  name: string;
  branch: 'architecture' | 'systems' | 'automation' | 'alignment';
  costCash: number;
  costRep: number;
  requires?: string[];
  description: string;
  effectSummary: string;
  unlocksArchitecture?: {
    id: string;
    name: string;
    baseQuality: number;
    computeReq: number;
    trainingDays: number;
    category: 'vision' | 'language' | 'multimodal' | 'agent';
  };
  unlocksAutomation?: 'autoQueueTraining' | 'autoBuyPower' | 'autoHireStaff';
  trainingSpeedBonus?: number;
  computeEfficiencyBonus?: number;
  safetyBonus?: number;
  revenueBonus?: number;
}

export const ERAS: EraDefinition[] = [
  {
    index: 0,
    id: 'era_2010_garage',
    packId: 'modern_2010_plus',
    name: 'Garage Deep Nets',
    startYear: 2010,
    tagline: 'Consumer GPUs meet layered neural nets.',
    accentColor: '#4da858',
    benchmarkCeiling: 42,
  },
  {
    index: 1,
    id: 'era_2014_representation',
    packId: 'modern_2010_plus',
    name: 'Representation Boom',
    startYear: 2014,
    tagline: 'Sequence models, residual blocks, and tensor pods.',
    accentColor: '#4ea8de',
    benchmarkCeiling: 64,
  },
  {
    index: 2,
    id: 'era_2017_attention',
    packId: 'modern_2010_plus',
    name: 'Attention & Transformers',
    startYear: 2017,
    tagline: 'Self-attention unlocks general pretrained models.',
    accentColor: '#e6b84c',
    benchmarkCeiling: 80,
  },
  {
    index: 3,
    id: 'era_2021_scaling',
    packId: 'modern_2010_plus',
    name: 'The Scaling Era',
    startYear: 2021,
    tagline: 'Liquid superpods, scaling laws, and multimodal fusion.',
    accentColor: '#9966cc',
    benchmarkCeiling: 93,
  },
  {
    index: 4,
    id: 'era_2025_agents',
    packId: 'modern_2010_plus',
    name: 'Agentic Frontier',
    startYear: 2025,
    tagline: 'Test-time reasoning chains and autonomous lab agents.',
    accentColor: '#e0534f',
    benchmarkCeiling: 100,
  },
];

export const TECH_NODES: TechNode[] = [
  // Era 0 (2010)
  {
    id: 'tech_convnet',
    eraIndex: 0,
    name: 'Deep ConvNets',
    branch: 'architecture',
    costCash: 0,
    costRep: 0,
    description: 'Multi-layer convolutional vision networks trained via GPU kernels.',
    effectSummary: 'Unlocks DeepVision-1 architecture',
    unlocksArchitecture: {
      id: 'arch_convnet',
      name: 'DeepVision ConvNet',
      baseQuality: 26,
      computeReq: 10,
      trainingDays: 10,
      category: 'vision',
    },
  },
  {
    id: 'tech_gpu_kernels',
    eraIndex: 0,
    name: 'Fused GPU Kernels',
    branch: 'systems',
    costCash: 6_500,
    costRep: 5,
    requires: ['tech_convnet'],
    description: 'Hand-tuned matrix multiply shaders squeeze more FLOPS per watt.',
    effectSummary: '+20% training speed, +10% compute efficiency',
    trainingSpeedBonus: 0.2,
    computeEfficiencyBonus: 0.1,
  },
  {
    id: 'tech_eval_harness',
    eraIndex: 0,
    name: 'Automated Eval Suite',
    branch: 'alignment',
    costCash: 8_000,
    costRep: 8,
    requires: ['tech_convnet'],
    description: 'Standardized validation benchmarks reduce catastrophic regressions.',
    effectSummary: '+8 Safety, +10% Product revenue',
    safetyBonus: 8,
    revenueBonus: 0.1,
  },

  // Era 1 (2014)
  {
    id: 'tech_seq2seq',
    eraIndex: 1,
    name: 'Recurrent Seq2Seq',
    branch: 'architecture',
    costCash: 18_000,
    costRep: 18,
    requires: ['tech_gpu_kernels'],
    description: 'Encoder-decoder sequence models for translation, chat, and code.',
    effectSummary: 'Unlocks SeqFlow-R architecture',
    unlocksArchitecture: {
      id: 'arch_seq2seq',
      name: 'SeqFlow Recurrent',
      baseQuality: 46,
      computeReq: 45,
      trainingDays: 14,
      category: 'language',
    },
  },
  {
    id: 'tech_auto_queue',
    eraIndex: 1,
    name: 'Pipeline Scheduler',
    branch: 'automation',
    costCash: 22_000,
    costRep: 20,
    requires: ['tech_gpu_kernels'],
    description: 'Automatically queues the next training iteration as soon as GPUs free up.',
    effectSummary: 'Unlocks Auto-Queue Training',
    unlocksAutomation: 'autoQueueTraining',
  },
  {
    id: 'tech_distributed',
    eraIndex: 1,
    name: 'Ring All-Reduce',
    branch: 'systems',
    costCash: 28_000,
    costRep: 24,
    requires: ['tech_seq2seq'],
    description: 'Synchronize gradients across dozens of GPUs with low overhead.',
    effectSummary: '+25% training speed, +15% compute efficiency',
    trainingSpeedBonus: 0.25,
    computeEfficiencyBonus: 0.15,
  },

  // Era 2 (2017)
  {
    id: 'tech_attention',
    eraIndex: 2,
    name: 'Multi-Head Attention',
    branch: 'architecture',
    costCash: 58_000,
    costRep: 40,
    requires: ['tech_distributed'],
    description: 'Pure attention blocks parallelize sequence training at massive scale.',
    effectSummary: 'Unlocks Attentive-X Transformer',
    unlocksArchitecture: {
      id: 'arch_transformer',
      name: 'Attentive-X Transformer',
      baseQuality: 68,
      computeReq: 180,
      trainingDays: 18,
      category: 'language',
    },
  },
  {
    id: 'tech_auto_power',
    eraIndex: 2,
    name: 'Smart Grid Controller',
    branch: 'automation',
    costCash: 45_000,
    costRep: 35,
    requires: ['tech_auto_queue'],
    description: 'Automatically expands grid power contracts whenever cluster demand spikes.',
    effectSummary: 'Unlocks Auto-Buy Power',
    unlocksAutomation: 'autoBuyPower',
  },
  {
    id: 'tech_preference_tuning',
    eraIndex: 2,
    name: 'Preference Alignment',
    branch: 'alignment',
    costCash: 64_000,
    costRep: 45,
    requires: ['tech_attention'],
    description: 'Human preference modeling makes outputs helpful, steered, and safer.',
    effectSummary: '+14 Safety, +25% API revenue',
    safetyBonus: 14,
    revenueBonus: 0.25,
  },

  // Era 3 (2021)
  {
    id: 'tech_multimodal',
    eraIndex: 3,
    name: 'Unified Multimodal MoE',
    branch: 'architecture',
    costCash: 165_000,
    costRep: 68,
    requires: ['tech_attention'],
    description: 'Sparse mixture-of-experts processing text, vision, and code natively.',
    effectSummary: 'Unlocks OmniMoE Frontier model',
    unlocksArchitecture: {
      id: 'arch_moe',
      name: 'OmniMoE Multimodal',
      baseQuality: 85,
      computeReq: 620,
      trainingDays: 22,
      category: 'multimodal',
    },
  },
  {
    id: 'tech_auto_hire',
    eraIndex: 3,
    name: 'Talent Scout Engine',
    branch: 'automation',
    costCash: 120_000,
    costRep: 55,
    requires: ['tech_auto_power'],
    description: 'Automatically recruits top specialists whenever open desks are available.',
    effectSummary: 'Unlocks Auto-Hire Staff',
    unlocksAutomation: 'autoHireStaff',
  },

  // Era 4 (2025)
  {
    id: 'tech_reasoning_agents',
    eraIndex: 4,
    name: 'Verifiable Reasoning Agents',
    branch: 'architecture',
    costCash: 390_000,
    costRep: 88,
    requires: ['tech_multimodal', 'tech_preference_tuning'],
    description: 'Long-horizon tool-using agents trained on verifiable reasoning traces.',
    effectSummary: 'Unlocks Synthesis-Agent Frontier',
    unlocksArchitecture: {
      id: 'arch_agent',
      name: 'Synthesis Reasoning Agent',
      baseQuality: 98,
      computeReq: 1400,
      trainingDays: 26,
      category: 'agent',
    },
  },
];

export const TECH_BY_ID: Record<string, TechNode> = Object.fromEntries(
  TECH_NODES.map((t) => [t.id, t]),
);
