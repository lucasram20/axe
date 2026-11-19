/**
 * Funding rounds ladder from Garage Angels to IPO.
 */

export interface FundingRoundDefinition {
  id: string;
  name: string;
  cashAward: number;
  equityDilutionPct: number;
  minRep: number;
  minTopBenchmark: number;
  minModelsShipped: number;
  valuationPostMoney: number;
  description: string;
}

export const FUNDING_ROUNDS: FundingRoundDefinition[] = [
  {
    id: 'round_angel',
    name: 'Angel Pre-Seed',
    cashAward: 35_000,
    equityDilutionPct: 8,
    minRep: 10,
    minTopBenchmark: 15,
    minModelsShipped: 0,
    valuationPostMoney: 440_000,
    description: 'Early angel backers betting on your garage prototypes.',
  },
  {
    id: 'round_seed',
    name: 'Seed Round',
    cashAward: 110_000,
    equityDilutionPct: 12,
    minRep: 20,
    minTopBenchmark: 32,
    minModelsShipped: 1,
    valuationPostMoney: 1_200_000,
    description: 'Venture seed capital to build your first dedicated GPU room.',
  },
  {
    id: 'round_series_a',
    name: 'Series A',
    cashAward: 320_000,
    equityDilutionPct: 14,
    minRep: 35,
    minTopBenchmark: 50,
    minModelsShipped: 2,
    valuationPostMoney: 3_500_000,
    description: 'Institutional backing to hire senior researchers and tensor pods.',
  },
  {
    id: 'round_cloud_deal',
    name: 'Strategic Compute Partnership',
    cashAward: 680_000,
    equityDilutionPct: 10,
    minRep: 52,
    minTopBenchmark: 68,
    minModelsShipped: 3,
    valuationPostMoney: 9_800_000,
    description: 'A major cloud consortium invests cash and priority power contracts.',
  },
  {
    id: 'round_series_b',
    name: 'Series B Frontier',
    cashAward: 1_650_000,
    equityDilutionPct: 12,
    minRep: 70,
    minTopBenchmark: 82,
    minModelsShipped: 4,
    valuationPostMoney: 24_000_000,
    description: 'Scale liquid-cooled superpods and challenge the global leaderboard.',
  },
  {
    id: 'round_ipo',
    name: 'Public IPO',
    cashAward: 4_500_000,
    equityDilutionPct: 10,
    minRep: 88,
    minTopBenchmark: 92,
    minModelsShipped: 6,
    valuationPostMoney: 95_000_000,
    description: 'Ring the bell as the defining independent frontier AI lab.',
  },
];
