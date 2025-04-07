'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BuildingOfficeIcon, 
  CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
  TruckIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'client';
  companyId: string;
  profilePhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Company {
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
  maxBookingDays: number;
  availableServices: {
    shower: boolean;
    laundry: boolean;
    haircut: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Statistics {
  scheduledShowers: number;
  scheduledLaundry: number;
  scheduledHaircuts: number;
  userCount: number;
}

export default function AdminHomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({
    scheduledShowers: 0,
    scheduledLaundry: 0,
    scheduledHaircuts: 0,
    userCount: 0
  });
  const router = useRouter();

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if user is authenticated
        if (!auth.currentUser) {
          console.log('No authenticated user found');
          router.push('/login');
          return;
        }

        console.log('Authenticated user:', auth.currentUser.uid);
        
        // Get current user data
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          console.log('User data loaded:', userData);
          setCurrentUser(userData);
          
          // Get current company data
          if (userData.companyId) {
            console.log('Loading company data for ID:', userData.companyId);
            const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
            if (companyDoc.exists()) {
              const companyData = companyDoc.data() as Company;
              console.log('Company data loaded:', companyData);
              setCurrentCompany(companyData);
            } else {
              console.log('Company document not found');
            }
            
            // Fetch statistics immediately after getting user data
            await fetchStatistics(userData.companyId);
          } else {
            console.log('No company ID found in user data');
          }
        } else {
          console.log('User document not found');
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure Firebase auth is initialized
    const timer = setTimeout(() => {
      initializeData();
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  const fetchStatistics = async (companyId?: string) => {
    console.log('fetchStatistics called');
    try {
      const id = companyId || currentUser?.companyId;
      if (!id) {
        console.log('No companyId available');
        return;
      }
      
      // Get the start and end of the current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      // Query for scheduled services this week
      const servicesQuery = query(
        collection(db, 'appointments'),
        where('companyId', '==', id),
        where('date', '>=', startOfWeek),
        where('date', '<=', endOfWeek)
      );
      
      const servicesSnapshot = await getDocs(servicesQuery);
      
      // Count services by type
      let scheduledShowers = 0;
      let scheduledLaundry = 0;
      let scheduledHaircuts = 0;
      
      servicesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.serviceType === 'shower') scheduledShowers++;
        else if (data.serviceType === 'laundry') scheduledLaundry++;
        else if (data.serviceType === 'haircut') scheduledHaircuts++;
      });
      
      // Get users for the company
      console.log('Company ID for users query:', id);
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', id),
        where('role', '==', 'user')
      );
      const usersSnapshot = await getDocs(usersQuery);
      console.log('Users snapshot size:', usersSnapshot.size);
      const uniqueUserIds = new Set<string>();
      usersSnapshot.forEach(doc => uniqueUserIds.add(doc.id));
      
      const userCount = uniqueUserIds.size;
      console.log('Final user count:', userCount);
      
      setStatistics({
        scheduledShowers,
        scheduledLaundry,
        scheduledHaircuts,
        userCount
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Debug function to check user data
  const debugUserData = async () => {
    try {
      console.log('Current user:', currentUser);
      
      // Get all users
      const allUsersQuery = query(collection(db, 'users'));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      console.log('All users:', allUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Get users for the company
      if (currentUser?.companyId) {
        const companyUsersQuery = query(
          collection(db, 'users'),
          where('companyId', '==', currentUser.companyId)
        );
        const companyUsersSnapshot = await getDocs(companyUsersQuery);
        console.log('Company users:', companyUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Get users with role 'user'
        const roleUsersQuery = query(
          collection(db, 'users'),
          where('companyId', '==', currentUser.companyId),
          where('role', '==', 'user')
        );
        const roleUsersSnapshot = await getDocs(roleUsersQuery);
        console.log('Role users:', roleUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error('Error debugging user data:', error);
    }
  };
  
  // Expose debug function to window
  useEffect(() => {
    (window as any).debugUserData = debugUserData;
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1b1b]">
        <div className="text-xl text-[#ffa300]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1b1b] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#ffa300] mb-8">Admin Dashboard</h1>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-[#ffa300] rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#3e2802]">Scheduled Showers</h3>
              <SparklesIcon className="h-8 w-8 text-[#3e2802]" />
            </div>
            <p className="text-3xl font-bold text-[#3e2802]">{statistics.scheduledShowers}</p>
            <p className="text-sm text-[#3e2802] mt-1">This Week</p>
          </div>
          
          <div className="bg-[#ffa300] rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#3e2802]">Scheduled Laundry</h3>
              <TruckIcon className="h-8 w-8 text-[#3e2802]" />
            </div>
            <p className="text-3xl font-bold text-[#3e2802]">{statistics.scheduledLaundry}</p>
            <p className="text-sm text-[#3e2802] mt-1">This Week</p>
          </div>
          
          <div className="bg-[#ffa300] rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#3e2802]">Scheduled Haircuts</h3>
              <ScissorsIcon className="h-8 w-8 text-[#3e2802]" />
            </div>
            <p className="text-3xl font-bold text-[#3e2802]">{statistics.scheduledHaircuts}</p>
            <p className="text-sm text-[#3e2802] mt-1">This Week</p>
          </div>
          
          <div className="bg-[#ffa300] rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#3e2802]">Current User Count</h3>
              <UserGroupIcon className="h-8 w-8 text-[#3e2802]" />
            </div>
            <p className="text-3xl font-bold text-[#3e2802]">{statistics.userCount}</p>
            <p className="text-sm text-[#3e2802] mt-1">Active Users</p>
          </div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin_dashboard" className="block">
            <div className="bg-[#3e2802] hover:bg-[#2a1c01] text-[#ffa300] p-6 rounded-lg shadow transition-colors duration-200">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold">Today's Dashboard</h3>
                  <p className="text-sm mt-1">View and manage today's appointments and services</p>
                </div>
              </div>
            </div>
          </Link>
          
          <Link href="/admin_settings" className="block">
            <div className="bg-[#3e2802] hover:bg-[#2a1c01] text-[#ffa300] p-6 rounded-lg shadow transition-colors duration-200">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold">Company Settings</h3>
                  <p className="text-sm mt-1">Manage company information, trailers, stalls, and users</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
} 