export interface HaircutAvailability {
  id: string;
  companyId: string;
  date: Date;
  startTime: string;
  endTime: string;
  appointmentDuration: number; // in minutes
  maxAppointments: number;
  createdAt: Date;
  updatedAt: Date;
} 