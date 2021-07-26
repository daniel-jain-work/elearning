// a predefined class schedule repeats weekly/by-weekly or every 4 weeks
export interface ScheduleOption {
  weekday: number;
  hour: number;
  minute: number;
  offset?: number; // in weeks
  interval: 1 | 2 | 4 | 8;
}

export interface ScheduleDefs {
  [id: string]: ScheduleOption[];
}

export const holidays = [
  '2020-07-04',
  '2020-09-07',
  '2020-11-26',
  '2020-12-24',
  '2020-12-25',
  '2020-12-31'
];

export const standardShifts = [
  [9, 0],
  [10, 30],
  [12, 0],
  [14, 30],
  [16, 0],
  [17, 30],
  [19, 0]
];

export const shiftConfig = {
  standard: standardShifts,
  first: standardShifts[0],
  last: standardShifts[standardShifts.length - 1]
};

export const trialSchedules: ScheduleDefs = {
  scratch_0: [
    { weekday: 1, hour: 10, minute: 30, interval: 1 },
    { weekday: 1, hour: 16, minute: 0, interval: 1 },
    { weekday: 2, hour: 10, minute: 30, interval: 1 },
    { weekday: 2, hour: 16, minute: 0, interval: 1 },
    { weekday: 3, hour: 10, minute: 30, interval: 1 },
    { weekday: 3, hour: 16, minute: 0, interval: 1 },
    { weekday: 4, hour: 10, minute: 30, interval: 1 },
    { weekday: 4, hour: 16, minute: 0, interval: 1 },
    { weekday: 5, hour: 10, minute: 30, interval: 1 },
    { weekday: 5, hour: 16, minute: 0, interval: 1 },
    { weekday: 6, hour: 10, minute: 30, interval: 1 },
    { weekday: 6, hour: 16, minute: 0, interval: 1 },
    { weekday: 7, hour: 10, minute: 30, interval: 1 },
    { weekday: 7, hour: 16, minute: 0, interval: 1 }
  ],
  scratch_junior: [
    { weekday: 1, hour: 9, minute: 0, interval: 1 },
    { weekday: 1, hour: 12, minute: 0, interval: 1 },
    { weekday: 1, hour: 14, minute: 30, interval: 1 },
    { weekday: 2, hour: 9, minute: 0, interval: 1 },
    { weekday: 2, hour: 12, minute: 0, interval: 1 },
    { weekday: 2, hour: 14, minute: 30, interval: 1 },
    { weekday: 3, hour: 9, minute: 0, interval: 1 },
    { weekday: 3, hour: 12, minute: 0, interval: 1 },
    { weekday: 3, hour: 14, minute: 30, interval: 1 },
    { weekday: 4, hour: 9, minute: 0, interval: 1 },
    { weekday: 4, hour: 12, minute: 0, interval: 1 },
    { weekday: 4, hour: 14, minute: 30, interval: 1 },
    { weekday: 5, hour: 9, minute: 0, interval: 1 },
    { weekday: 5, hour: 12, minute: 0, interval: 1 },
    { weekday: 5, hour: 14, minute: 30, interval: 1 },
    { weekday: 6, hour: 9, minute: 0, interval: 1 },
    { weekday: 6, hour: 12, minute: 0, interval: 1 },
    { weekday: 6, hour: 14, minute: 30, interval: 1 },
    { weekday: 7, hour: 9, minute: 0, interval: 1 },
    { weekday: 7, hour: 12, minute: 0, interval: 1 },
    { weekday: 7, hour: 14, minute: 30, interval: 1 }
  ],
  ascratch_0: [
    { weekday: 1, hour: 10, minute: 30, interval: 1 },
    { weekday: 1, hour: 16, minute: 0, interval: 1 },
    { weekday: 2, hour: 10, minute: 30, interval: 1 },
    { weekday: 2, hour: 16, minute: 0, interval: 1 },
    { weekday: 3, hour: 10, minute: 30, interval: 1 },
    { weekday: 3, hour: 16, minute: 0, interval: 1 },
    { weekday: 4, hour: 10, minute: 30, interval: 1 },
    { weekday: 4, hour: 16, minute: 0, interval: 1 },
    { weekday: 5, hour: 10, minute: 30, interval: 1 },
    { weekday: 5, hour: 16, minute: 0, interval: 1 },
    { weekday: 6, hour: 10, minute: 30, interval: 1 },
    { weekday: 6, hour: 16, minute: 0, interval: 1 },
    { weekday: 7, hour: 10, minute: 30, interval: 1 },
    { weekday: 7, hour: 16, minute: 0, interval: 1 }
  ],
  'ai-explorers_0': [
    { weekday: 1, hour: 12, minute: 0, interval: 1 },
    { weekday: 1, hour: 16, minute: 0, interval: 1 },
    { weekday: 2, hour: 12, minute: 0, interval: 1 },
    { weekday: 2, hour: 16, minute: 0, interval: 1 },
    { weekday: 3, hour: 12, minute: 0, interval: 1 },
    { weekday: 3, hour: 16, minute: 0, interval: 1 },
    { weekday: 4, hour: 12, minute: 0, interval: 1 },
    { weekday: 4, hour: 16, minute: 0, interval: 1 },
    { weekday: 5, hour: 12, minute: 0, interval: 1 },
    { weekday: 5, hour: 16, minute: 0, interval: 1 },
    { weekday: 6, hour: 12, minute: 0, interval: 1 },
    { weekday: 6, hour: 16, minute: 0, interval: 1 },
    { weekday: 7, hour: 12, minute: 0, interval: 1 },
    { weekday: 7, hour: 16, minute: 0, interval: 1 }
  ],
  'data-science_0': [
    { weekday: 1, hour: 16, minute: 0, interval: 1 },
    { weekday: 2, hour: 16, minute: 0, interval: 1 },
    { weekday: 3, hour: 16, minute: 0, interval: 1 },
    { weekday: 4, hour: 16, minute: 0, interval: 1 },
    { weekday: 5, hour: 16, minute: 0, interval: 1 },
    { weekday: 6, hour: 16, minute: 0, interval: 1 },
    { weekday: 7, hour: 16, minute: 0, interval: 1 }
  ],
  minecraft_0: [
    { weekday: 1, hour: 14, minute: 30, interval: 1 },
    { weekday: 1, hour: 16, minute: 0, interval: 1 },
    { weekday: 2, hour: 14, minute: 30, interval: 1 },
    { weekday: 2, hour: 16, minute: 0, interval: 1 },
    { weekday: 3, hour: 14, minute: 30, interval: 1 },
    { weekday: 3, hour: 16, minute: 0, interval: 1 },
    { weekday: 4, hour: 14, minute: 30, interval: 1 },
    { weekday: 4, hour: 16, minute: 0, interval: 1 },
    { weekday: 5, hour: 14, minute: 30, interval: 1 },
    { weekday: 5, hour: 16, minute: 0, interval: 1 },
    { weekday: 6, hour: 14, minute: 30, interval: 1 },
    { weekday: 6, hour: 16, minute: 0, interval: 1 },
    { weekday: 7, hour: 14, minute: 30, interval: 1 },
    { weekday: 7, hour: 16, minute: 0, interval: 1 }
  ],
  python_0: [
    { weekday: 1, hour: 10, minute: 30, interval: 1 },
    { weekday: 1, hour: 14, minute: 30, interval: 1 },
    { weekday: 1, hour: 17, minute: 30, interval: 1 },
    { weekday: 2, hour: 10, minute: 30, interval: 1 },
    { weekday: 2, hour: 14, minute: 30, interval: 1 },
    { weekday: 2, hour: 17, minute: 30, interval: 1 },
    { weekday: 3, hour: 10, minute: 30, interval: 1 },
    { weekday: 3, hour: 14, minute: 30, interval: 1 },
    { weekday: 3, hour: 17, minute: 30, interval: 1 },
    { weekday: 4, hour: 10, minute: 30, interval: 1 },
    { weekday: 4, hour: 14, minute: 30, interval: 1 },
    { weekday: 4, hour: 17, minute: 30, interval: 1 },
    { weekday: 5, hour: 10, minute: 30, interval: 1 },
    { weekday: 5, hour: 14, minute: 30, interval: 1 },
    { weekday: 5, hour: 17, minute: 30, interval: 1 },
    { weekday: 6, hour: 10, minute: 30, interval: 1 },
    { weekday: 6, hour: 14, minute: 30, interval: 1 },
    { weekday: 6, hour: 17, minute: 30, interval: 1 },
    { weekday: 7, hour: 10, minute: 30, interval: 1 },
    { weekday: 7, hour: 14, minute: 30, interval: 1 },
    { weekday: 7, hour: 17, minute: 30, interval: 1 }
  ],
  design_0: [
    { weekday: 1, hour: 10, minute: 30, interval: 1 },
    { weekday: 3, hour: 16, minute: 0, interval: 1 },
    { weekday: 6, hour: 13, minute: 0, interval: 1 }
  ],
  robots_0: [
    { weekday: 1, hour: 10, minute: 30, interval: 1 },
    { weekday: 3, hour: 16, minute: 0, interval: 1 },
    { weekday: 6, hour: 13, minute: 0, interval: 1 }
  ]
};

export const paidSchedules: ScheduleDefs = {
  'ai-explorers_1': [
    { weekday: 1, hour: 16, minute: 0, interval: 4, offset: 2 },
    { weekday: 1, hour: 17, minute: 30, interval: 4, offset: 3 },

    { weekday: 2, hour: 14, minute: 30, interval: 4, offset: 2 },
    { weekday: 2, hour: 16, minute: 0, interval: 4, offset: 3 },
    { weekday: 2, hour: 17, minute: 30, interval: 4 },

    { weekday: 3, hour: 16, minute: 0, interval: 4 },
    { weekday: 3, hour: 17, minute: 30, interval: 4, offset: 1 },

    { weekday: 4, hour: 14, minute: 30, interval: 4 },
    { weekday: 4, hour: 16, minute: 0, interval: 4, offset: 1 },
    { weekday: 4, hour: 17, minute: 30, interval: 4, offset: 2 },

    { weekday: 5, hour: 14, minute: 30, interval: 4, offset: 3 },
    { weekday: 5, hour: 16, minute: 0, interval: 4, offset: 1 },

    { weekday: 7, hour: 14, minute: 30, interval: 4 },
    { weekday: 7, hour: 16, minute: 0, interval: 4, offset: 3 }
  ],
  'data-science_1': [
    { weekday: 1, hour: 16, minute: 0, interval: 4, offset: 2 },
    { weekday: 1, hour: 17, minute: 30, interval: 4, offset: 3 },

    { weekday: 2, hour: 14, minute: 30, interval: 4, offset: 2 },
    { weekday: 2, hour: 16, minute: 0, interval: 4, offset: 3 },
    { weekday: 2, hour: 17, minute: 30, interval: 4 },

    { weekday: 3, hour: 14, minute: 30, interval: 4, offset: 3 },
    { weekday: 3, hour: 16, minute: 0, interval: 4 },
    { weekday: 3, hour: 17, minute: 30, interval: 4, offset: 1 },

    { weekday: 4, hour: 14, minute: 30, interval: 4 },
    { weekday: 4, hour: 16, minute: 0, interval: 4, offset: 1 },
    { weekday: 4, hour: 17, minute: 30, interval: 4, offset: 2 },

    { weekday: 5, hour: 14, minute: 30, interval: 4, offset: 1 },
    { weekday: 5, hour: 16, minute: 0, interval: 4, offset: 3 },

    { weekday: 6, hour: 9, minute: 0, interval: 8 },
    { weekday: 6, hour: 10, minute: 30, interval: 8, offset: 4 },
    { weekday: 6, hour: 12, minute: 0, interval: 8, offset: 2 },

    { weekday: 7, hour: 14, minute: 30, interval: 8, offset: 6 },
    { weekday: 7, hour: 16, minute: 0, interval: 8, offset: 3 },
    { weekday: 7, hour: 17, minute: 30, interval: 8, offset: 7 }
  ],
  scratch_1: [
    { weekday: 1, hour: 16, minute: 0, interval: 4, offset: 2 },
    { weekday: 1, hour: 17, minute: 30, interval: 4, offset: 3 },

    { weekday: 2, hour: 14, minute: 30, interval: 4, offset: 2 },
    { weekday: 2, hour: 16, minute: 0, interval: 4, offset: 3 },
    { weekday: 2, hour: 17, minute: 30, interval: 4 },

    { weekday: 3, hour: 16, minute: 0, interval: 4 },
    { weekday: 3, hour: 17, minute: 30, interval: 4, offset: 1 },

    { weekday: 4, hour: 14, minute: 30, interval: 4 },
    { weekday: 4, hour: 16, minute: 0, interval: 4, offset: 1 },
    { weekday: 4, hour: 17, minute: 30, interval: 4, offset: 2 },

    { weekday: 5, hour: 14, minute: 30, interval: 4, offset: 3 },
    { weekday: 5, hour: 16, minute: 0, interval: 4, offset: 1 },

    { weekday: 7, hour: 14, minute: 30, interval: 4 },
    { weekday: 7, hour: 16, minute: 0, interval: 4, offset: 3 }
  ],
  ascratch_1: [
    { weekday: 1, hour: 16, minute: 0, interval: 4, offset: 2 },
    { weekday: 1, hour: 17, minute: 30, interval: 4, offset: 3 },

    { weekday: 2, hour: 14, minute: 30, interval: 4, offset: 2 },
    { weekday: 2, hour: 16, minute: 0, interval: 4, offset: 3 },
    { weekday: 2, hour: 17, minute: 30, interval: 4 },

    { weekday: 3, hour: 14, minute: 30, interval: 4, offset: 3 },
    { weekday: 3, hour: 16, minute: 0, interval: 4 },
    { weekday: 3, hour: 17, minute: 30, interval: 4, offset: 1 },

    { weekday: 4, hour: 14, minute: 30, interval: 4 },
    { weekday: 4, hour: 16, minute: 0, interval: 4, offset: 1 },
    { weekday: 4, hour: 17, minute: 30, interval: 4, offset: 2 },

    { weekday: 5, hour: 14, minute: 30, interval: 4, offset: 1 },
    { weekday: 5, hour: 16, minute: 0, interval: 4, offset: 3 },

    { weekday: 7, hour: 14, minute: 30, interval: 8, offset: 6 },
    { weekday: 7, hour: 16, minute: 0, interval: 8, offset: 3 },
    { weekday: 7, hour: 17, minute: 30, interval: 8, offset: 7 }
  ],
  minecraft_1: [
    { weekday: 1, hour: 16, minute: 0, interval: 4, offset: 2 },
    { weekday: 1, hour: 17, minute: 30, interval: 4, offset: 3 },

    { weekday: 2, hour: 14, minute: 30, interval: 4, offset: 2 },
    { weekday: 2, hour: 16, minute: 0, interval: 4, offset: 3 },
    { weekday: 2, hour: 17, minute: 30, interval: 4 },

    { weekday: 3, hour: 14, minute: 30, interval: 4, offset: 3 },
    { weekday: 3, hour: 16, minute: 0, interval: 4 },
    { weekday: 3, hour: 17, minute: 30, interval: 4, offset: 1 },

    { weekday: 4, hour: 14, minute: 30, interval: 4 },
    { weekday: 4, hour: 16, minute: 0, interval: 4, offset: 1 },
    { weekday: 4, hour: 17, minute: 30, interval: 4, offset: 2 },

    { weekday: 5, hour: 14, minute: 30, interval: 4, offset: 1 },
    { weekday: 5, hour: 16, minute: 0, interval: 4, offset: 3 },

    { weekday: 7, hour: 14, minute: 30, interval: 8, offset: 6 },
    { weekday: 7, hour: 16, minute: 0, interval: 8, offset: 3 },
    { weekday: 7, hour: 17, minute: 30, interval: 8, offset: 7 }
  ],
  web_1: [
    { weekday: 1, hour: 17, minute: 30, interval: 4, offset: 3 },

    { weekday: 2, hour: 14, minute: 30, interval: 4 },

    { weekday: 3, hour: 16, minute: 0, interval: 4 },
    { weekday: 3, hour: 17, minute: 30, interval: 4, offset: 1 },

    { weekday: 4, hour: 14, minute: 30, interval: 4, offset: 1 },
    { weekday: 4, hour: 16, minute: 0, interval: 4, offset: 2 },

    { weekday: 5, hour: 16, minute: 0, interval: 4, offset: 3 },

    { weekday: 6, hour: 14, minute: 30, interval: 2, offset: 1 },

    { weekday: 7, hour: 14, minute: 30, interval: 2 },
    { weekday: 7, hour: 16, minute: 0, interval: 2, offset: 1 }
  ],
  robots_1: [
    { weekday: 2, hour: 16, minute: 0, interval: 4 },
    { weekday: 2, hour: 17, minute: 30, interval: 4, offset: 1 },
    { weekday: 4, hour: 16, minute: 0, interval: 4, offset: 1 },
    { weekday: 4, hour: 17, minute: 30, interval: 4 },
    { weekday: 6, hour: 10, minute: 30, interval: 4 },
    { weekday: 6, hour: 12, minute: 0, interval: 4, offset: 1 }
  ],
  python_1: [
    { weekday: 3, hour: 16, minute: 0, interval: 4, offset: 1 },
    { weekday: 4, hour: 17, minute: 30, interval: 4 }
  ]
};

export const campWeekDays: number[][] = [
  [1, 4],
  [2, 5],
  [3, 6],
  [3, 7],
  [1, 2, 3, 4],
  [2, 3, 4, 5]
];

export const campPatterns: [number, number, number][][] = [
  // Sunday
  [[3, 4, 3]],
  // Monday
  [
    [3, 4, 3],
    [1, 1, 1]
  ],
  // Tuesday
  [
    [3, 4, 3],
    [1, 1, 1]
  ],
  // Wednesday
  [
    [3, 4, 3],
    [4, 3, 4]
  ],
  // Thursday
  [[4, 3, 4]],
  // Friday
  [[4, 3, 4]],
  // Saturday
  [[4, 3, 4]]
];
