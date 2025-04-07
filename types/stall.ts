export type StallStatus = 'available' | 'in_use' | 'refreshing' | 'out_of_order';
export type ServiceType = 'shower' | 'laundry' | 'haircut';

export interface Stall {
  id: string;
  name: string;
  companyId: string;
  trailerGroup: string;
  status: StallStatus;
  serviceType: ServiceType;
  duration: number;
  bufferTime: number;
  createdAt: Date;
  updatedAt: Date;
}
