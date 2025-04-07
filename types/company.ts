export interface Company {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  openTime: string;
  closeTime: string;
  openDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  maxBookingDays?: number; // Optional field for maximum days users can book in advance
  availableServices: {
    shower: boolean;
    laundry: boolean;
    haircut: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
