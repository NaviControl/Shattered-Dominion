// DRAFT neutral rosters, PENDING APPROVAL. One roster per territory type (five wild-node rosters).
// Roster creature level = 5 x territory level (draft).
export interface NeutralMember { creature_id: string; tier: number; rarity: string; size_class: 'small'|'medium'|'large'|'huge'|'colossal'; movement: number; range: number }
export interface NeutralRosterDraft { tier: number; anchors: Array<[number, number]>; members: NeutralMember[] }
export type NeutralType = 'farmland' | 'lumber_mill' | 'stone_quarry' | 'iron_vein' | 'mana_monolith' | 'monster_lair' | 'ancient_ruin' | 'mythical_tower';
export const NEUTRAL_ROSTER_DRAFT: Record<NeutralType, NeutralRosterDraft> = {
  "farmland": {
    "tier": 1,
    "anchors": [
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        2,
        0
      ]
    ],
    "members": [
      {
        "creature_id": "SD-0001",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 3,
        "range": 1
      },
      {
        "creature_id": "SD-0002",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 3
      },
      {
        "creature_id": "SD-0003",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 1
      }
    ]
  },
  "lumber_mill": {
    "tier": 1,
    "anchors": [
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        2,
        0
      ]
    ],
    "members": [
      {
        "creature_id": "SD-0004",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 3
      },
      {
        "creature_id": "SD-0005",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 1
      },
      {
        "creature_id": "SD-0006",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 2
      }
    ]
  },
  "stone_quarry": {
    "tier": 1,
    "anchors": [
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        2,
        0
      ]
    ],
    "members": [
      {
        "creature_id": "SD-0007",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 1
      },
      {
        "creature_id": "SD-0008",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 2
      },
      {
        "creature_id": "SD-0009",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 1,
        "range": 4
      }
    ]
  },
  "iron_vein": {
    "tier": 1,
    "anchors": [
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        2,
        0
      ]
    ],
    "members": [
      {
        "creature_id": "SD-0010",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 2
      },
      {
        "creature_id": "SD-0011",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 1,
        "range": 4
      },
      {
        "creature_id": "SD-0012",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 3,
        "range": 1
      }
    ]
  },
  "mana_monolith": {
    "tier": 1,
    "anchors": [
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        2,
        0
      ]
    ],
    "members": [
      {
        "creature_id": "SD-0013",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 1,
        "range": 4
      },
      {
        "creature_id": "SD-0014",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 3,
        "range": 1
      },
      {
        "creature_id": "SD-0037",
        "tier": 1,
        "rarity": "common",
        "size_class": "small",
        "movement": 2,
        "range": 1
      }
    ]
  },
  "monster_lair": {
    "tier": 4,
    "anchors": [
      [
        0,
        0
      ],
      [
        2,
        0
      ]
    ],
    "members": [
      {
        "creature_id": "SD-0031",
        "tier": 4,
        "rarity": "epic",
        "size_class": "huge",
        "movement": 1,
        "range": 4
      },
      {
        "creature_id": "SD-0032",
        "tier": 4,
        "rarity": "epic",
        "size_class": "huge",
        "movement": 3,
        "range": 1
      }
    ]
  },
  "ancient_ruin": {
    "tier": 2,
    "anchors": [
      [
        0,
        0
      ],
      [
        2,
        0
      ]
    ],
    "members": [
      {
        "creature_id": "SD-0015",
        "tier": 2,
        "rarity": "uncommon",
        "size_class": "medium",
        "movement": 3,
        "range": 1
      },
      {
        "creature_id": "SD-0016",
        "tier": 2,
        "rarity": "uncommon",
        "size_class": "medium",
        "movement": 3,
        "range": 1
      }
    ]
  },
  "mythical_tower": {
    "tier": 3,
    "anchors": [
      [
        0,
        0
      ],
      [
        0,
        1
      ],
      [
        0,
        2
      ]
    ],
    "members": [
      {
        "creature_id": "SD-0025",
        "tier": 3,
        "rarity": "rare",
        "size_class": "large",
        "movement": 2,
        "range": 1
      },
      {
        "creature_id": "SD-0026",
        "tier": 3,
        "rarity": "rare",
        "size_class": "large",
        "movement": 2,
        "range": 2
      },
      {
        "creature_id": "SD-0027",
        "tier": 3,
        "rarity": "rare",
        "size_class": "large",
        "movement": 1,
        "range": 4
      }
    ]
  }
};
