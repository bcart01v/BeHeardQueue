import { Timestamp } from 'firebase/firestore';
import { User } from '@/types/user';
import { Stall } from '@/types/stall';
import { Trailer } from '@/types/trailer';

export type AppointmentStatus = 'scheduled' | 'in-progress' | 'completed' | 'missed' | 'cancelled' | 'checked-in';

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
  duration: number;
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