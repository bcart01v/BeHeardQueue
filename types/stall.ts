export type StallStatus = "in_use" | "out_of_order" | "refreshing" | "available";

export type Stall = {
  id?: string;
  name: string;
  status: StallStatus;
  trailerGroup: string; // id/name of associated trailer group
};
