export type ServiceType = "laundry" | "shower" | "haircut";

export type Trailer = {
  id?: string;
  name: string; // could also be license plate
  serviceType: ServiceType;
  startTime: string;
  endTime: string;
  duration: number;
  bufferTime: number;
  slotsPerBlock: number;
  stalls: string[]; // stall IDs
  location: string; // geographical location of the trailer
};
