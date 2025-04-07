export interface Trailer {
  id: string;
  name: string;
  companyId: string;
  startTime: string;
  endTime: string;
  stalls: never[];
  location: string;
  duration?: number; // Duration of each appointment in minutes (optional)
  createdAt: Date;
  updatedAt: Date;
}
