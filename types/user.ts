export type UserRole = 'user' | 'admin' | 'software-owner';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'software-owner';
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  displayName?: string;
  currentCompanyId?: string; // The company the user is currently viewing
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
