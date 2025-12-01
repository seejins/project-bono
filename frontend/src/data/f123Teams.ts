export interface F123Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textClass: string;
  aliases: string[];
}

const teams: F123Team[] = [
  {
    id: 'red_bull',
    name: 'Red Bull Racing',
    shortName: 'RBR',
    color: '#1E41FF',
    textClass: 'team-redbull',
    aliases: [
      'red bull',
      'redbull',
      'oracle red bull racing',
      'rbr',
      'rb racing'
    ],
  },
  {
    id: 'mercedes',
    name: 'Mercedes',
    shortName: 'MER',
    color: '#00D2BE',
    textClass: 'team-mercedes',
    aliases: [
      'mercedes-amg',
      'mercedes amg',
      'mercedes-amg petronas',
      'mercedes amg petronas',
      'mercedes-amg petronas formula one team',
      'mercedes-benz',
      'mercedes f1'
    ],
  },
  {
    id: 'ferrari',
    name: 'Ferrari',
    shortName: 'FER',
    color: '#DC143C',
    textClass: 'team-ferrari',
    aliases: [
      'scuderia ferrari',
      'ferrari f1',
      'ferrari s.p.a.',
      'sf-23'
    ],
  },
  {
    id: 'mclaren',
    name: 'McLaren',
    shortName: 'MCL',
    color: '#FF8700',
    textClass: 'team-mclaren',
    aliases: [
      'mclaren f1',
      'mclaren formula 1',
      'mclaren racing',
      'mclaren mp4'
    ],
  },
  {
    id: 'aston_martin',
    name: 'Aston Martin',
    shortName: 'AMR',
    color: '#006F62',
    textClass: 'team-aston-martin',
    aliases: [
      'aston martin aramco cognizant',
      'aston martin f1',
      'aston martin cognizant',
      'aston martin formula one team'
    ],
  },
  {
    id: 'alpine',
    name: 'Alpine',
    shortName: 'ALP',
    color: '#FF69B4', // BWT pink - changed from #0090FF (light blue)
    textClass: 'team-alpine',
    aliases: [
      'bwt alpine f1 team',
      'alpine f1',
      'alpine renault',
      'alpine racing'
    ],
  },
  {
    id: 'sauber',
    name: 'Alfa Romeo',
    shortName: 'ARO',
    color: '#9B0000',
    textClass: 'team-sauber',
    aliases: [
      'alfa romeo',
      'alfa romeo racing',
      'alfa romeo f1',
      'sauber'
    ],
  },
  {
    id: 'haas',
    name: 'Haas',
    shortName: 'HAA',
    color: '#E10600', // 2023 Haas red
    textClass: 'team-haas',
    aliases: [
      'haas f1 team',
      'haas f1'
    ],
  },
  {
    id: 'williams',
    name: 'Williams',
    shortName: 'WIL',
    color: '#005AFF',
    textClass: 'team-williams',
    aliases: [
      'williams racing',
      'williams f1',
      'rokit williams',
      'dorilton williams'
    ],
  },
  {
    id: 'alphatauri',
    name: 'AlphaTauri',
    shortName: 'AT',
    color: '#1E2A5A', // 2023 AlphaTauri slate/navy blue
    textClass: 'team-alphatauri',
    aliases: [
      'scuderia alphatauri',
      'alpha tauri',
      'alphatauri honda',
      'alphatauri f1'
    ],
  },
];

const normalizeAlias = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const aliasMap = new Map<string, F123Team>();

teams.forEach((team) => {
  const uniqueAliases = new Set<string>([
    team.id,
    team.name,
    team.shortName,
    ...team.aliases,
  ]);

  uniqueAliases.forEach((alias) => {
    const key = normalizeAlias(alias);
    if (!aliasMap.has(key)) {
      aliasMap.set(key, team);
    }
  });
});

export const F123_TEAMS: F123Team[] = teams;

export const TEAM_LOOKUP = aliasMap;

export function findTeamByName(teamName?: string | null): F123Team | null {
  if (!teamName) {
    return null;
  }

  const key = normalizeAlias(teamName);
  return aliasMap.get(key) ?? null;
}

