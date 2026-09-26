export const colors = {
  accent: "#2F7D5C",
  accentPressed: "#256246",
  accentSoft: "#E8F2ED",
  action: "#202522",
  actionPressed: "#151A17",
  actionText: "#FFFFFF",
  border: "#D8DEDA",
  borderSubtle: "#EBEFEC",
  canvas: "#F7F8F7",
  danger: "#B42318",
  dangerSoft: "#FEE4E2",
  inverse: "#FFFFFF",
  overlay: "rgba(32, 37, 34, 0.32)",
  pendingSoft: "#FFF4D6",
  pendingText: "#8A5A12",
  primaryText: "#202522",
  secondaryText: "#68716C",
  subtleSurface: "#F0F2F0",
  surface: "#FFFFFF",
} as const;

export const radii = {
  control: 999,
  pill: 999,
  surface: 16,
} as const;

export const shadows = {
  floating: {
    elevation: 2,
    shadowColor: "#202522",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  surface: {
    elevation: 0,
    shadowColor: "#202522",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
  },
} as const;
