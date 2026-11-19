/**
 * Data-driven staff roles, specialties, traits, and procedural name pools.
 */

export type StaffRole =
  | 'researcher'
  | 'ml_engineer'
  | 'data_engineer'
  | 'infra_devops'
  | 'product'
  | 'sales';

export interface RoleDefinition {
  id: StaffRole;
  label: string;
  shortLabel: string;
  shirtColor: string;
  accentColor: string;
  baseSalaryPerDay: number;
  hireFee: number;
  description: string;
  primaryEffect: string;
}

export interface StaffTrait {
  id: string;
  name: string;
  description: string;
  researchMult?: number;
  speedMult?: number;
  revenueMult?: number;
  safetyBonus?: number;
  moodDecayMult?: number;
  salaryMult?: number;
}

export const STAFF_ROLES: Record<StaffRole, RoleDefinition> = {
  researcher: {
    id: 'researcher',
    label: 'AI Researcher',
    shortLabel: 'Research',
    shirtColor: '#4ea8de',
    accentColor: '#8de4ff',
    baseSalaryPerDay: 140,
    hireFee: 2_400,
    description: 'Invents architectures and pushes benchmark scores higher.',
    primaryEffect: '+Benchmark quality & research speed',
  },
  ml_engineer: {
    id: 'ml_engineer',
    label: 'ML Engineer',
    shortLabel: 'ML Eng',
    shirtColor: '#4da858',
    accentColor: '#8ce063',
    baseSalaryPerDay: 130,
    hireFee: 2_100,
    description: 'Optimizes training kernels and accelerates model runs.',
    primaryEffect: '+Training speed & efficiency',
  },
  data_engineer: {
    id: 'data_engineer',
    label: 'Data Engineer',
    shortLabel: 'Data',
    shirtColor: '#3a6f73',
    accentColor: '#b0e2f7',
    baseSalaryPerDay: 115,
    hireFee: 1_800,
    description: 'Cleans corpora, builds eval pipelines, and reduces data risk.',
    primaryEffect: '+Dataset quality & safety',
  },
  infra_devops: {
    id: 'infra_devops',
    label: 'Infra / DevOps',
    shortLabel: 'Infra',
    shirtColor: '#9966cc',
    accentColor: '#b8c0cf',
    baseSalaryPerDay: 125,
    hireFee: 2_000,
    description: 'Keeps GPU clusters online, cool, and running at peak utilization.',
    primaryEffect: '+Compute utilization & cooling',
  },
  product: {
    id: 'product',
    label: 'Product Lead',
    shortLabel: 'Product',
    shirtColor: '#e0534f',
    accentColor: '#f59876',
    baseSalaryPerDay: 120,
    hireFee: 1_900,
    description: 'Turns trained models into sticky APIs and consumer apps.',
    primaryEffect: '+User growth & retention',
  },
  sales: {
    id: 'sales',
    label: 'Enterprise Sales',
    shortLabel: 'Sales',
    shirtColor: '#f8f0df',
    accentColor: '#e6b84c',
    baseSalaryPerDay: 110,
    hireFee: 1_600,
    description: 'Closes enterprise API deals and boosts recurring revenue.',
    primaryEffect: '+API revenue & investor hype',
  },
};

export const STAFF_ROLE_LIST: RoleDefinition[] = Object.values(STAFF_ROLES);

export const STAFF_TRAITS: StaffTrait[] = [
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: '+15% training speed during evening shifts.',
    speedMult: 1.15,
  },
  {
    id: 'paper_machine',
    name: 'Paper Machine',
    description: '+18% benchmark quality and reputation gain.',
    researchMult: 1.18,
  },
  {
    id: 'ten_x_debugger',
    name: '10x Debugger',
    description: '+20% training speed; spots NaN loss spikes early.',
    speedMult: 1.2,
  },
  {
    id: 'caffeine_fiend',
    name: 'Caffeine Fiend',
    description: 'Loves espresso; mood decays 30% slower.',
    moodDecayMult: 0.7,
  },
  {
    id: 'safety_first',
    name: 'Alignment Hawk',
    description: '+6 lab safety rating and cleaner evals.',
    safetyBonus: 6,
  },
  {
    id: 'deal_closer',
    name: 'Deal Closer',
    description: '+20% product & API monetization.',
    revenueMult: 1.2,
  },
  {
    id: 'frugal_hacker',
    name: 'Garage Hacker',
    description: '20% lower salary expectations.',
    salaryMult: 0.8,
  },
  {
    id: 'open_source_star',
    name: 'Open Source Star',
    description: '+12% quality and builds organic hype.',
    researchMult: 1.12,
    revenueMult: 1.08,
  },
];

export const STAFF_TRAIT_BY_ID: Record<string, StaffTrait> = Object.fromEntries(
  STAFF_TRAITS.map((t) => [t.id, t]),
);

export const FIRST_NAMES = [
  'Ada', 'Kenji', 'Priya', 'Marcus', 'Elena', 'Tomas', 'Nadia', 'Devon',
  'Sora', 'Hana', 'Liam', 'Farah', 'Caleb', 'Mei', 'Victor', 'Zara',
  'Owen', 'Anika', 'Julian', 'Rina', 'Mateo', 'Clara', 'Idris', 'Tessa',
];

export const LAST_NAMES = [
  'Chen', 'Patel', 'Kowalski', 'Okafor', 'Lindqvist', 'Sato', 'Vargas', 'Park',
  'Haddad', 'Novak', 'Mercer', 'Reyes', 'Bauer', 'Kim', 'Silva', 'Mori',
  'Foster', 'Alvarez', 'Cho', 'Dubois', 'Rossi', 'Tanaka', 'Brooks', 'Nolan',
];

export const HAIR_COLORS = ['#14121d', '#3d241d', '#6b3b2a', '#9e5e3b', '#e6b84c', '#8c96ab'];
export const SKIN_TONES = ['#f5d5b8', '#e6b89c', '#cf9670', '#9e6847', '#6b422c'];
