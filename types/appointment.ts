import { Stall } from './stall';
import { Trailer } from './trailer';
import { User } from './user';

export interface Appointment {
  id: string;
  userId: string;
  stallId: string;
  trailerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentWithDetails extends Appointment {
  user: User;
  stall: Stall;
  trailer: Trailer;
}
