'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BuildingOfficeIcon, 
  CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
  TruckIcon,
  ScissorsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { useAdminGuard } from '../hooks/useAdminGuard';

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

interface Appointment {
  id: string;
  userId: string;
  companyId: string;
  serviceType: 'shower' | 'laundry' | 'haircut';
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  stallId: string;
  stallName?: string;
  userName?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GroupedAppointments {
  [date: string]: Appointment[];
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
  const [futureAppointments, setFutureAppointments] = useState<GroupedAppointments>({});
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const router = useRouter();
  const { authorized, loading } = useAdminGuard();
  const [theme, setTheme] = useState('dark');

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

  // Fetch future appointments
  const fetchFutureAppointments = async () => {
    try {
      if (!currentUser?.companyId) {
        console.error('No company ID available');
        return;
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('companyId', '==', currentUser.companyId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      // Get all users for this company to map IDs to names
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', currentUser.companyId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersMap = new Map();
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        usersMap.set(doc.id, userData.firstName && userData.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : userData.email || `User ${doc.id.substring(0, 4)}`);
      });
      
      // Get all stalls for this company to map IDs to names
      const stallsQuery = query(
        collection(db, 'stalls'),
        where('companyId', '==', currentUser.companyId)
      );
      const stallsSnapshot = await getDocs(stallsQuery);
      const stallsMap = new Map();
      
      stallsSnapshot.forEach(doc => {
        const stallData = doc.data();
        stallsMap.set(doc.id, stallData.name || `Stall ${doc.id.substring(0, 4)}`);
      });

      for (const doc of querySnapshot.docs) {
        const appointmentData = doc.data();
        const stallName = stallsMap.get(appointmentData.stallId) || `Stall ${appointmentData.stallId.substring(0, 4)}`;
        const userName = usersMap.get(appointmentData.userId) || `User ${appointmentData.userId.substring(0, 4)}`;
        
        const appointment: Appointment = {
          id: doc.id,
          userId: appointmentData.userId,
          companyId: appointmentData.companyId,
          serviceType: appointmentData.serviceType,
          date: appointmentData.date.toDate(),
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          status: appointmentData.status,
          stallId: appointmentData.stallId,
          stallName: stallName,
          userName: userName,
          createdAt: appointmentData.createdAt.toDate(),
          updatedAt: appointmentData.updatedAt.toDate()
        };
        appointments.push(appointment);
      }

      // Group appointments by date
      const groupedAppointments = appointments.reduce((acc, appointment) => {
        const date = appointment.date.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(appointment);
        return acc;
      }, {} as GroupedAppointments);

      // Sort appointments within each date by time
      Object.keys(groupedAppointments).forEach(date => {
        groupedAppointments[date].sort((a, b) => {
          const [hoursA, minutesA] = a.startTime.split(':').map(Number);
          const [hoursB, minutesB] = b.startTime.split(':').map(Number);
          
          const timeA = new Date(date);
          timeA.setHours(hoursA, minutesA, 0, 0);
          
          const timeB = new Date(date);
          timeB.setHours(hoursB, minutesB, 0, 0);
          
          return timeA.getTime() - timeB.getTime();
        });
      });

      setFutureAppointments(groupedAppointments);
    } catch (error) {
      console.error('Error fetching future appointments:', error);
    }
  };
  
  // Update appointments when date range changes
  useEffect(() => {
    if (currentUser?.companyId) {
      fetchFutureAppointments();
    }
  }, [currentUser?.companyId, startDate, endDate]);
  
  // Handle date navigation
  const handleDateChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setStartDate(subDays(startDate, 7));
      setEndDate(subDays(endDate, 7));
    } else {
      setStartDate(addDays(startDate, 7));
      setEndDate(addDays(endDate, 7));
    }
  };
  
  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'EEEE, MMMM d, yyyy');
  };
  
  // Get service icon based on service type
  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'shower':
        return <SparklesIcon className="h-5 w-5 text-blue-500" />;
      case 'laundry':
        return <TruckIcon className="h-5 w-5 text-green-500" />;
      case 'haircut':
        return <ScissorsIcon className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  // Get status color based on appointment status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-600';
      case 'in_progress':
        return 'bg-green-600';
      case 'completed':
        return 'bg-gray-600';
      case 'cancelled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  // Handle appointment click
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  // Close appointment modal
  const closeAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setSelectedAppointment(null);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-[#1e1b1b]' : 'bg-white'}`}>
        <div className={`text-xl ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1e1b1b]' : 'bg-white'} p-6`}>
      <div className="max-w-7xl mx-auto">
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} mb-8`}>Admin Dashboard</h1>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className={`${theme === 'dark' ? 'bg-[#ffa300]' : 'bg-[#3e2802]'} rounded-lg shadow p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`}>Scheduled Showers</h3>
              <SparklesIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`} />
            </div>
            <div className="mt-4">
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`}>{statistics.scheduledShowers}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'} mt-1`}>This Week</p>
            </div>
          </div>
          
          <div className={`${theme === 'dark' ? 'bg-[#ffa300]' : 'bg-[#3e2802]'} rounded-lg shadow p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`}>Scheduled Laundry</h3>
              <TruckIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`} />
            </div>
            <div className="mt-4">
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`}>{statistics.scheduledLaundry}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'} mt-1`}>This Week</p>
            </div>
          </div>
          
          <div className={`${theme === 'dark' ? 'bg-[#ffa300]' : 'bg-[#3e2802]'} rounded-lg shadow p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`}>Scheduled Haircuts</h3>
              <ScissorsIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`} />
            </div>
            <div className="mt-4">
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`}>{statistics.scheduledHaircuts}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'} mt-1`}>This Week</p>
            </div>
          </div>
          
          <div className={`${theme === 'dark' ? 'bg-[#ffa300]' : 'bg-[#3e2802]'} rounded-lg shadow p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`}>Current User Count</h3>
              <UserGroupIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`} />
            </div>
            <div className="mt-4">
              <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'}`}>{statistics.userCount}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'} mt-1`}>Active Users</p>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/resource_dashboard" className={`${theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'} hover:bg-[#2a1c01] ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} p-6 rounded-lg shadow transition-colors duration-200`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Resource Dashboard</h3>
                <p className="text-sm mt-1">View and manage resources</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </Link>
          <Link href="/admin_settings" className={`${theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'} hover:bg-[#2a1c01] ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} p-6 rounded-lg shadow transition-colors duration-200`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Company Settings</h3>
                <p className="text-sm mt-1">Manage company settings</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </Link>
        </div>
        
        {/* Future Appointments */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>Future Appointments</h2>
          <div className="flex items-center space-x-4 mt-4">
            <button
              onClick={() => handleDateChange('prev')}
              className={`p-2 rounded-full ${theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'} hover:bg-[#2a1c01] ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} transition-colors duration-200`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => handleDateChange('next')}
              className={`p-2 rounded-full ${theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'} hover:bg-[#2a1c01] ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} transition-colors duration-200`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Appointments List */}
        <div className="space-y-6">
          {loading ? (
            <div className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>Loading appointments...</div>
          ) : Object.keys(futureAppointments).length === 0 ? (
            <div className={`${theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'} rounded-lg p-6 text-center`}>
              <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>No appointments found for the selected date range.</p>
            </div>
          ) : (
            Object.keys(futureAppointments).sort().map(dateStr => (
              <div key={dateStr} className={`${theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'} rounded-lg overflow-hidden`}>
                <div className={`${theme === 'dark' ? 'bg-[#2a1c01]' : 'bg-[#3e2802]'} p-4`}>
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>{formatDateDisplay(dateStr)}</h3>
                </div>
                <div className="p-4">
                  <h4 className={`text-md font-medium ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} mb-2`}>
                    {futureAppointments[dateStr].length} Appointment{futureAppointments[dateStr].length !== 1 ? 's' : ''}
                  </h4>
                  <div className="space-y-2">
                    {futureAppointments[dateStr].map(appointment => (
                      <div
                        key={appointment.id}
                        onClick={() => handleAppointmentClick(appointment)}
                        className={`flex items-center justify-between ${theme === 'dark' ? 'bg-[#1e1b1b]' : 'bg-white'} p-3 rounded-md cursor-pointer hover:bg-[#2a1c01] transition-colors duration-200`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(appointment.status)}`} />
                          <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} font-medium capitalize`}>
                            {appointment.serviceType}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>
                            {appointment.startTime} - {appointment.endTime}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Appointment Details Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'} rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>Appointment Details</h3>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} hover:text-white transition-colors duration-200`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} font-medium`}>{selectedAppointment.userName}</p>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} text-sm`}>User</p>
                  </div>
                  <div>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} font-medium capitalize`}>{selectedAppointment.serviceType}</p>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} text-sm`}>Service Type</p>
                  </div>
                  <div>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>{format(selectedAppointment.date, 'EEEE, MMMM d, yyyy')}</p>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} text-sm`}>Date</p>
                  </div>
                  <div>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>{selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} text-sm`}>Time</p>
                  </div>
                  <div>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>{selectedAppointment.stallName}</p>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} text-sm`}>Location</p>
                  </div>
                  <div>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} font-mono text-sm`}>{selectedAppointment.id}</p>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} text-sm`}>Appointment ID</p>
                  </div>
                  <div>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>{format(selectedAppointment.createdAt, 'MMM d, yyyy h:mm a')}</p>
                    <p className={`${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} text-sm`}>Created At</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className={`px-4 py-2 ${theme === 'dark' ? 'bg-[#1e1b1b]' : 'bg-[#f3f4f6]'} ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'} rounded-md hover:bg-[#2a1c01] transition-colors duration-200`}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      router.push(`/resource_dashboard?appointment=${selectedAppointment.id}&date=${format(selectedAppointment.date, 'yyyy-MM-dd')}`);
                      setSelectedAppointment(null);
                    }}
                    className={`px-4 py-2 ${theme === 'dark' ? 'bg-[#ffa300]' : 'bg-[#3e2802]'} ${theme === 'dark' ? 'text-[#3e2802]' : 'text-[#ffa300]'} rounded-md hover:bg-[#e69200] transition-colors duration-200`}
                  >
                    View in Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 