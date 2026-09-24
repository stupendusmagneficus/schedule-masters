export const colors = {
  accent: "#2D8A62",
  accentPressed: "#246B4C",
  accentSoft: "#E1F3EA",
  border: "#D9E2DC",
  borderSubtle: "#E2E9E3",
  canvas: "#F7F8F5",
  danger: "#C43D4B",
  inverse: "#FFFFFF",
  primaryText: "#202A24",
  secondaryText: "#5F6E65",
  subtleSurface: "#F1F4F0",
  surface: "#FFFFFF",
} as const;

export const radii = {
  control: 8,
  pill: 999,
  surface: 18,
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
