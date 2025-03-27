type ServiceType = "laundry" | "shower" | "haircut";

type Trailer = {
  name: string; // could also be license plate
  serviceType: ServiceType;
  startTime: string;
  endTime: string;
  duration: number;
  bufferTime: number;
  slotsPerBlock: number;
  stalls: string[]; // stall IDs
};
