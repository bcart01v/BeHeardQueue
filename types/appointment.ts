import { Stall } from './stall';
import { Trailer } from './trailer';
import { User } from './user';
import { ServiceType } from './stall';

export interface Appointment {
  id: string;
  userId: string;
  companyId: string;
  stallId: string;
  trailerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  serviceType: ServiceType;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentWithDetails extends Appointment {
  user: User;
  stall: Stall;
  trailer: Trailer;
}
