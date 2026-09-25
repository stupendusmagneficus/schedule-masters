export const colors = {
  accent: "#C9284B",
  accentPressed: "#9F1F3B",
  accentSoft: "#FBE8EC",
  action: "#1A1B20",
  actionPressed: "#3A3B42",
  actionText: "#FFFFFF",
  border: "#D9D9E0",
  borderSubtle: "#E9E9EE",
  canvas: "#F5F5F7",
  danger: "#C43D4B",
  dangerSoft: "#FCEBED",
  inverse: "#FFFFFF",
  primaryText: "#1A1B20",
  pendingSoft: "#FFF3D6",
  pendingText: "#8A5A00",
  secondaryText: "#71727A",
  subtleSurface: "#F0F0F3",
  surface: "#FFFFFF",
} as const;

export const radii = {
  control: 10,
  pill: 999,
  surface: 16,
} as const;

export const shadows = {
  floating: {
    elevation: 4,
    shadowColor: "#1A1B20",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  surface: {
    elevation: 1,
    shadowColor: "#1A1B20",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
} as const;
