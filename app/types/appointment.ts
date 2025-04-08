import { Timestamp } from 'firebase/firestore';
import { User } from './user';
import { Stall } from './stall';
import { Trailer } from './trailer';

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
  serviceType: 'shower' | 'laundry' | 'haircut';
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentWithDetails extends Appointment {
  user: User;
  stall: Stall;
  trailer: Trailer;
}

export interface HistoricalAppointment extends AppointmentWithDetails {
  movedToHistoryAt: Date;
  originalId: string; // ID from the original appointments collection
  reason: 'completed' | 'cancelled' | 'missed' | 'past_date';
} 