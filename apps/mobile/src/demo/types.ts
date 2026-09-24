import type { Service } from "../types";

export type DemoAppointment = {
  readonly clientName: string;
  readonly durationMinutes: number;
  readonly id: string;
  readonly initials: string;
  readonly priceAmount: number;
  readonly serviceName: string;
  readonly startsAt: string;
  readonly status: "confirmed" | "pending";
};

export type DemoData = {
  readonly appointments: readonly DemoAppointment[];
  readonly freeSlots: readonly string[];
  readonly primaryService: Service;
};
