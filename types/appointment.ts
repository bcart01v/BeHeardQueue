import { Stall } from './stall';
import { Trailer } from './trailer';
import { User } from './user';
import { ServiceType } from './stall';

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

export interface Appointment {
  id: string;
  userId: string;
  companyId: string;
  stallId: string;
  trailerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  serviceType: ServiceType;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentWithDetails extends Appointment {
  user: User;
  stall: Stall | null;
  trailer: Trailer | null;
}

export interface HistoricalAppointment extends AppointmentWithDetails {
  movedToHistoryAt: Date;
  originalId: string;
  reason: 'completed' | 'cancelled' | 'missed' | 'past_date';
}
