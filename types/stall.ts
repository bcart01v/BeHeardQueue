export type StallStatus = 'available' | 'in_use' | 'refreshing' | 'out_of_order';
export type ServiceType = 'shower' | 'laundry' | 'haircut';

export interface Stall {
  id: string;
  name: string;
  companyId: string; // The company the stall belongs to
  trailerGroup: string; // The trailer ID this stall belongs to
  status: StallStatus;
  serviceType: ServiceType;
  createdAt: Date;
  updatedAt: Date;
}
