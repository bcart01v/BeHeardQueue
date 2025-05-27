export type UserRole = 'user' | 'admin' | 'software-owner';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  phone?: string;
  dateOfBirth?: Date;
  race?: 'Asian' | 'Black/African' | 'Hispanic' | 'Native American' | 'Mixed';
  gender?: 'Male' | 'Female';
  isVeteran?: boolean;
  role: 'admin' | 'user' | 'software-owner';
  companyId: string; // The company the user belongs to
  createdAt: Date;
  updatedAt: Date;
  displayName?: string;
  profilePhoto?: string; // URL to the user's profile photo
  completedIntake: boolean; // Whether the user has completed the intake form
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftwareOwner extends User {
  role: 'software-owner';
  companies: string[]; // Array of company IDs that the software owner manages
}
