export const colors = {
  accent: "#124C46",
  accentPressed: "#0C3935",
  accentSoft: "#DCEBE5",
  action: "#E8BB70",
  actionPressed: "#C99645",
  actionText: "#173A35",
  border: "#E3DCD1",
  borderSubtle: "#EEE8DF",
  canvas: "#F3F0E9",
  danger: "#C43D4B",
  dangerSoft: "#FCEBED",
  heroMuted: "#C6D9D1",
  inverse: "#FFFFFF",
  primaryText: "#173A35",
  pendingSoft: "#FFF3D6",
  pendingText: "#8A5A00",
  secondaryText: "#66736D",
  subtleSurface: "#EAE6DE",
  surface: "#FFFDF8",
} as const;

export const radii = {
  control: 12,
  pill: 999,
  surface: 24,
} as const;

export const shadows = {
  floating: {
    elevation: 4,
    shadowColor: "#202A24",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  surface: {
    elevation: 1,
    shadowColor: "#202A24",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
} as const;
