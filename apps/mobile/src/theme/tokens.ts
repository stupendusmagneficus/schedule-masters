export const colors = {
  accent: "#24292F",
  accentPressed: "#1F2328",
  accentSoft: "#EAEFF3",
  border: "#D0D7DE",
  borderSubtle: "#D8DEE4",
  canvas: "#F6F8FA",
  danger: "#CF222E",
  inverse: "#FFFFFF",
  primaryText: "#24292F",
  secondaryText: "#57606A",
  subtleSurface: "#F6F8FA",
  surface: "#FFFFFF",
} as const;

export const radii = {
  control: 8,
  pill: 999,
  surface: 12,
} as const;

export const shadows = {
  floating: {
    elevation: 4,
    shadowColor: "#1F2328",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  surface: {
    elevation: 1,
    shadowColor: "#1F2328",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
} as const;
