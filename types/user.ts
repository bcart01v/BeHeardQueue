export type UserRole = 'user' | 'admin' | 'software-owner';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'software-owner';
  companyId: string; // The company the user belongs to
  createdAt: Date;
  updatedAt: Date;
  displayName?: string;
  phone?: string; // User's phone number
  profilePhoto?: string; // URL to the user's profile photo
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
