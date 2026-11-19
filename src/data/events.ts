/**
 * Data-driven random lab events with meaningful trade-off choices.
 */

export interface EventEffect {
  cashDelta?: number;
  repDelta?: number;
  hypeDelta?: number;
  safetyDelta?: number;
  moodDelta?: number;
  tempComputePenaltyDays?: number;
  tempPowerPenaltyDays?: number;
}

export interface EventChoice {
  id: string;
  label: string;
  outcomeText: string;
  effect: EventEffect;
}

export interface GameEventDefinition {
  id: string;
  title: string;
  category: 'market' | 'talent' | 'media' | 'safety' | 'infra';
  minEra?: number;
  description: string;
  choices: EventChoice[];
}

export const GAME_EVENTS: GameEventDefinition[] = [
  {
    id: 'evt_gpu_shortage',
    title: 'Global GPU Supply Crunch',
    category: 'market',
    description:
      'Crypto miners and rival clusters just bought out regional distributor stock. Spare parts and emergency compute leases surged overnight.',
    choices: [
      {
        id: 'pay_premium',
        label: 'Pay Spot Premium (-$8,000)',
        outcomeText: 'You secured priority allocations. Compute stays at 100% and investors admire your grit.',
        effect: { cashDelta: -8_000, repDelta: 3, hypeDelta: 4 },
      },
      {
        id: 'throttle_rigs',
        label: 'Underclock & Wait It Out',
        outcomeText: 'Cash stays intact, though cluster throughput dips briefly while cooling down older cards.',
        effect: { cashDelta: 0, tempComputePenaltyDays: 10, moodDelta: -4 },
      },
    ],
  },
  {
    id: 'evt_talent_poacher',
    title: 'Rival Talent Poachers',
    category: 'talent',
    description:
      'A deep-pocketed competitor is messaging your senior researchers with aggressive signing bonuses.',
    choices: [
      {
        id: 'match_bonuses',
        label: 'Issue Retention Bonuses (-$6,500)',
        outcomeText: 'Your team feels valued and stays locked in on the next frontier run.',
        effect: { cashDelta: -6_500, moodDelta: 18, repDelta: 4 },
      },
      {
        id: 'pitch_mission',
        label: 'Host All-Hands Mission Pitch',
        outcomeText: 'Most engineers rally around the mission, though morale takes a tiny dent.',
        effect: { moodDelta: -6, hypeDelta: 3 },
      },
    ],
  },
  {
    id: 'evt_viral_demo',
    title: 'Research Demo Goes Viral',
    category: 'media',
    description:
      'An intern posted a 20-second clip of your latest model solving puzzles live. Developer forums are lighting up.',
    choices: [
      {
        id: 'open_sandbox',
        label: 'Launch Public Sandbox (-$3,500)',
        outcomeText: 'Traffic spikes! Reputation and hype jump as thousands try your API.',
        effect: { cashDelta: -3_500, hypeDelta: 16, repDelta: 8 },
      },
      {
        id: 'publish_blog',
        label: 'Publish Technical Writeup',
        outcomeText: 'Peers applaud the clean methodology. Steady reputation and safety credibility.',
        effect: { repDelta: 6, safetyDelta: 5, hypeDelta: 6 },
      },
    ],
  },
  {
    id: 'evt_power_brownout',
    title: 'City Grid Brownout',
    category: 'infra',
    description:
      'A heatwave strained the municipal substation feeding your lab block. Voltage is sagging.',
    choices: [
      {
        id: 'rent_diesel',
        label: 'Deploy Emergency Generators (-$5,000)',
        outcomeText: 'Zero downtime on your training runs. The infra crew earns high fives.',
        effect: { cashDelta: -5_000, moodDelta: 6, repDelta: 2 },
      },
      {
        id: 'pause_heavy',
        label: 'Checkpoint & Shed Load',
        outcomeText: 'Clean checkpoints saved! Power output is reduced for a few days while utilities stabilize.',
        effect: { tempPowerPenaltyDays: 8, safetyDelta: 3 },
      },
    ],
  },
  {
    id: 'evt_regulatory_audit',
    title: 'AI Safety & Licensing Review',
    category: 'safety',
    description:
      'Industry standards auditors requested transparency documentation on your training corpora and evaluation red-teaming.',
    choices: [
      {
        id: 'full_audit',
        label: 'Publish Full Model Card (-$5,500)',
        outcomeText: 'Enterprise buyers love the rigor. Safety and Reputation climb.',
        effect: { cashDelta: -5_500, safetyDelta: 12, repDelta: 7 },
      },
      {
        id: 'minimal_compliance',
        label: 'File Minimal Disclosure',
        outcomeText: 'You save time and cash, though watchdogs dock your safety score.',
        effect: { safetyDelta: -10, repDelta: -3, hypeDelta: 3 },
      },
    ],
  },
  {
    id: 'evt_research_grant',
    title: 'Academic Compute Grant',
    category: 'market',
    description:
      'A science foundation noticed your recent benchmark climbs and offered a non-dilutive research fellowship.',
    choices: [
      {
        id: 'accept_grant',
        label: 'Accept Grant (+$12,000)',
        outcomeText: 'Fresh non-dilutive capital hits the treasury alongside an academic shoutout.',
        effect: { cashDelta: 12_000, repDelta: 5, moodDelta: 8 },
      },
      {
        id: 'coauthor_paper',
        label: 'Co-Author Open Safety Paper (+$6,000)',
        outcomeText: 'Half the grant funds open benchmarks, significantly lifting your standing.',
        effect: { cashDelta: 6_000, repDelta: 10, safetyDelta: 8 },
      },
    ],
  },
  {
    id: 'evt_data_leak_scare',
    title: 'Staging Bucket Misconfiguration',
    category: 'safety',
    description:
      'An automated scanner flagged a test evaluation set exposed on a staging endpoint before anyone scraped it.',
    choices: [
      {
        id: 'hire_sec_audit',
        label: 'Run Security Hardening (-$7,000)',
        outcomeText: 'Zero data exfiltrated and infrastructure security is stronger than ever.',
        effect: { cashDelta: -7_000, safetyDelta: 10, repDelta: 3 },
      },
      {
        id: 'quiet_patch',
        label: 'Hotfix Quietly',
        outcomeText: 'Fixed in ten minutes, though rumors slightly dent trust.',
        effect: { safetyDelta: -8, repDelta: -4 },
      },
    ],
  },
];
