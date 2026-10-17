import type { Service, Workspace } from "../types";
import type { DemoData } from "./types";

export const demoWorkspace: Workspace = {
  availabilityRules: Array.from({ length: 7 }, (_, index) => ({
    dayOfWeek: index + 1,
    endLocalTime: "21:00",
    startLocalTime: "08:00",
  })),
  bookingIntervalMinutes: 30,
  id: "demo-workspace",
  name: "Elena Beauty",
  slug: "elena-beauty",
  timezone: "Europe/Prague",
};

const demoService: Service = {
  archived_at: null,
  buffer_after_minutes: 0,
  buffer_before_minutes: 0,
  category: "Manikúra",
  currency: "CZK",
  description: "A complete gel manicure with a clean finish.",
  duration_minutes: 90,
  id: "demo-service",
  is_active: true,
  name: "Gel manicure",
  price_amount: 700,
  sort_order: 0,
};

const demoBlockStart = new Date();
demoBlockStart.setHours(13, 0, 0, 0);
const demoBlockEnd = new Date(demoBlockStart);
demoBlockEnd.setHours(14, 0, 0, 0);

export const demoData: DemoData = {
  appointments: [
    {
      clientName: "Anna K.",
      durationMinutes: 90,
      id: "demo-appointment-1",
      initials: "AK",
      priceAmount: 700,
      serviceName: "Gel manicure",
      startsAt: "09:30",
      status: "confirmed",
    },
    {
      clientName: "Maria P.",
      durationMinutes: 60,
      id: "demo-appointment-2",
      initials: "MP",
      priceAmount: 500,
      serviceName: "Classic manicure",
      startsAt: "13:00",
      status: "confirmed",
    },
    {
      clientName: "Sofia R.",
      durationMinutes: 90,
      id: "demo-appointment-3",
      initials: "SR",
      priceAmount: 700,
      serviceName: "Gel manicure",
      startsAt: "16:00",
      status: "pending",
    },
    {
      clientName: "Natalia V.",
      durationMinutes: 60,
      id: "demo-appointment-4",
      initials: "NV",
      priceAmount: 500,
      serviceName: "Nail repair",
      startsAt: "19:00",
      status: "confirmed",
    },
  ],
  freeSlots: ["11:00", "14:30", "17:30"],
  personalBlocks: [
    {
      ends_at: demoBlockEnd.toISOString(),
      id: "demo-personal-block-1",
      reason: "Oběd",
      starts_at: demoBlockStart.toISOString(),
    },
  ],
  primaryService: demoService,
};
