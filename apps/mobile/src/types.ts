export type Workspace = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
};

export type Service = {
  readonly name: string;
  readonly duration_minutes: number;
  readonly price_amount: number;
};
