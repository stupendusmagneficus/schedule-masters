import type { Service, Workspace } from "../types";
import type { DemoData } from "./types";

export const demoWorkspace: Workspace = {
  id: "demo-workspace",
  name: "Elena Beauty",
  slug: "elena-beauty",
  timezone: "Europe/Prague",
};

const demoService: Service = {
  duration_minutes: 90,
  name: "Gel manicure",
  price_amount: 700,
};

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
  primaryService: demoService,
};
