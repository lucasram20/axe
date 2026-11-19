/**
 * Fictional rival AI labs for the leaderboard (no real company names or trademarks).
 */

export interface RivalTemplate {
  id: string;
  name: string;
  motto: string;
  color: string;
  startBenchmark: number;
  growthPerYear: number;
  startValuation: number;
  flagshipPrefix: string;
}

export const RIVAL_TEMPLATES: RivalTemplate[] = [
  {
    id: 'rival_helios',
    name: 'Helios Mind',
    motto: 'General intelligence through scale',
    color: '#e6b84c',
    startBenchmark: 24,
    growthPerYear: 5.4,
    startValuation: 450_000,
    flagshipPrefix: 'Sol',
  },
  {
    id: 'rival_vectorforge',
    name: 'VectorForge',
    motto: 'Open weights for builders',
    color: '#4ea8de',
    startBenchmark: 21,
    growthPerYear: 4.8,
    startValuation: 310_000,
    flagshipPrefix: 'Vex',
  },
  {
    id: 'rival_cortexa',
    name: 'Cortexa Research',
    motto: 'Safety-verified reasoning systems',
    color: '#9966cc',
    startBenchmark: 22,
    growthPerYear: 5.1,
    startValuation: 390_000,
    flagshipPrefix: 'Cora',
  },
  {
    id: 'rival_northstar',
    name: 'Northstar Compute',
    motto: 'Silicon-first AI infrastructure',
    color: '#4da858',
    startBenchmark: 18,
    growthPerYear: 4.3,
    startValuation: 520_000,
    flagshipPrefix: 'Polaris',
  },
  {
    id: 'rival_aetheris',
    name: 'Aetheris Labs',
    motto: 'Multimodal creative engines',
    color: '#e0534f',
    startBenchmark: 16,
    growthPerYear: 4.6,
    startValuation: 240_000,
    flagshipPrefix: 'Aether',
  },
];
