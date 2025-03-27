type TimeBlock =
  | "early_morning"
  | "late_morning"
  | "early_afternoon"
  | "late_afternoon";

type Appointment = {
  id: string; // Firestore generated
  serviceType: ServiceType;
  userId: string;
  date: string; // YYYY--MM--DD format
  location: string;
  timeBlock: TimeBlock;
  appointmentTime?: string; // exact appointment time, optional until user checks in and is assigned a time by admin
  assignedUnit?: string; // assigned by admin on check-in
  checkedIn: boolean;
};
