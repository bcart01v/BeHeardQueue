import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Company } from '@/types/company';

// Create a new company
export const createCompany = async (
  name: string, 
  description: string, 
  ownerId: string,
  openTime: string = '09:00',
  closeTime: string = '17:00',
  openDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  } = {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  },
  maxBookingDays: number = 30,
  availableServices: {
    shower: boolean;
    laundry: boolean;
    haircut: boolean;
  } = {
    shower: true,
    laundry: true,
    haircut: false
  }
): Promise<Company> => {
  try {
    const companyData = {
      name,
      description,
      ownerId,
      openTime,
      closeTime,
      openDays,
      maxBookingDays,
      availableServices,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'companies'), companyData);
    
    return {
      id: docRef.id,
      name,
      description,
      ownerId,
      openTime,
      closeTime,
      openDays,
      maxBookingDays,
      availableServices,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
};

// Get companies for a specific owner
export const getCompaniesByOwner = async (ownerId: string): Promise<Company[]> => {
  try {
    const q = query(
      collection(db, 'companies'),
      where('ownerId', '==', ownerId)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        openTime: data.openTime || '09:00',
        closeTime: data.closeTime || '17:00',
        openDays: data.openDays || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        maxBookingDays: data.maxBookingDays || 30,
        availableServices: data.availableServices || {
          shower: true,
          laundry: true,
          haircut: false
        },
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error getting companies:', error);
    throw error;
  }
}; 