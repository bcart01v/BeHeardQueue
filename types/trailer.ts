export interface Trailer {
  id: string;
  name: string;
  companyId: string; // The company the trailer belongs to
  startTime: string;
  endTime: string;
  duration: number;
  bufferTime: number;
  slotsPerBlock: number;
  stalls: string[]; // Array of stall IDs
  location: string;
  createdAt: Date;
  updatedAt: Date;
}
