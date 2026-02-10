/**
 * Dekar (area) mapping for campuses and gardens.
 * GECICI: hardcoded; ileride admin panelden gelecek.
 */

export const CAMPUS_AREAS: Record<string, number> = {
  belek: 400,
  candir: 101,
  manavgat: 130,
};

/** Bahce adi -> dekar. Kampus bazinda. */
export const GARDEN_AREAS: Record<string, Record<string, number>> = {
  belek: {
    "Belek-1": 50,
    "Belek-2": 50,
    "Belek-3": 50,
    "Belek-4": 50,
    "Belek-5": 25,
    "Belek-6": 25,
    "Belek-7": 25,
    "Belek-8": 25,
    "Belek-9": 25,
    "Belek-10": 25,
    "Belek-11": 25,
    "Belek-12": 25,
  },
  candir: {
    "Candir-1": 50,
    "Candir-2": 50,
    "Candir-3": 1,
  },
  manavgat: {
    "Manavgat-1": 30,
    "Manavgat-2": 30,
    "Manavgat-3": 30,
    "Manavgat-4": 30,
    "Manavgat-5": 10,
  },
};

export const CAMPUS_LABELS: Record<string, string> = {
  belek: "Belek",
  candir: "Candir",
  manavgat: "Manavgat",
};
