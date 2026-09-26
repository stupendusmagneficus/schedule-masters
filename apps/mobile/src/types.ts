export type Workspace = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
};

export type Service = {
  readonly archived_at: string | null;
  readonly buffer_after_minutes: number;
  readonly buffer_before_minutes: number;
  readonly description: string | null;
  readonly id: string;
  readonly is_active: boolean;
  readonly name: string;
  readonly duration_minutes: number;
  readonly price_amount: number;
  readonly currency: string;
  readonly sort_order: number;
};
