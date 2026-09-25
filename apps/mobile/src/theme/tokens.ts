export const colors = {
  accent: "#334155",
  accentPressed: "#1E293B",
  accentSoft: "#F3E8FF",
  action: "#1E293B",
  actionPressed: "#0F172A",
  actionText: "#FFFFFF",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  canvas: "#F8FAFC",
  danger: "#B42318",
  dangerSoft: "#FEE4E2",
  inverse: "#FFFFFF",
  primaryText: "#1E293B",
  pendingSoft: "#FEF3C7",
  pendingText: "#92400E",
  secondaryText: "#64748B",
  subtleSurface: "#F1F5F9",
  surface: "#FFFFFF",
} as const;

export const radii = {
  control: 999,
  pill: 999,
  surface: 16,
} as const;

export const shadows = {
  floating: {
    elevation: 4,
    shadowColor: "#0F172A",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  surface: {
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
} as const;
