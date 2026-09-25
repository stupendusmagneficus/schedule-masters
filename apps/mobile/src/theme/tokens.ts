export const colors = {
  accent: "#2563EB",
  accentPressed: "#1D4ED8",
  accentSoft: "#EAF2FF",
  action: "#2563EB",
  actionPressed: "#1D4ED8",
  actionText: "#FFFFFF",
  border: "#D8DCE5",
  borderSubtle: "#E8EBF0",
  canvas: "#F3F4F6",
  danger: "#C43D4B",
  dangerSoft: "#FCEBED",
  inverse: "#FFFFFF",
  primaryText: "#111827",
  pendingSoft: "#FFF3D6",
  pendingText: "#8A5A00",
  secondaryText: "#667085",
  subtleSurface: "#EEF1F5",
  surface: "#FFFFFF",
} as const;

export const radii = {
  control: 999,
  pill: 999,
  surface: 20,
} as const;

export const shadows = {
  floating: {
    elevation: 4,
    shadowColor: "#111827",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  surface: {
    elevation: 1,
    shadowColor: "#111827",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
} as const;
