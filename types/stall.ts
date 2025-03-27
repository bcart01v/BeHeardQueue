type StallStatus = "in_use" | "out_of_order" | "refreshing";

type Stall = {
  name: string;
  status: StallStatus;
  trailerGroup: string; // id/name of associated trailer group
};
