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
  const handlePrevWeek = () => {
    setStartDate(subDays(startDate, 7));
    setEndDate(subDays(endDate, 7));
  };
  
  const handleNextWeek = () => {
    setStartDate(addDays(startDate, 7));
    setEndDate(addDays(endDate, 7));
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
        
        {/* Future Appointments Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#ffa300]">Future Appointments</h2>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handlePrevWeek}
                className="p-2 rounded-full bg-[#3e2802] hover:bg-[#2a1c01] text-[#ffa300] transition-colors duration-200"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="text-[#ffa300]">
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </span>
              <button 
                onClick={handleNextWeek}
                className="p-2 rounded-full bg-[#3e2802] hover:bg-[#2a1c01] text-[#ffa300] transition-colors duration-200"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {isLoadingAppointments ? (
            <div className="flex justify-center py-8">
              <div className="text-[#ffa300]">Loading appointments...</div>
            </div>
          ) : Object.keys(futureAppointments).length === 0 ? (
            <div className="bg-[#3e2802] rounded-lg p-6 text-center">
              <p className="text-[#ffa300]">No appointments found for the selected date range.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(futureAppointments).sort().map(dateStr => (
                <div key={dateStr} className="bg-[#3e2802] rounded-lg overflow-hidden">
                  <div className="bg-[#2a1c01] p-4">
                    <h3 className="text-lg font-semibold text-[#ffa300]">{formatDateDisplay(dateStr)}</h3>
                  </div>
                  <div className="p-4">
                    {futureAppointments[dateStr].map(appointment => (
                      <div key={appointment.id} className="mb-6 last:mb-0">
                        <h4 className="text-md font-medium text-[#ffa300] mb-2">
                          {appointment.userName}
                        </h4>
                        <div className="space-y-2">
                          <div 
                            className="flex items-center justify-between bg-[#1e1b1b] p-3 rounded-md cursor-pointer hover:bg-[#2a1c01] transition-colors duration-200"
                            onClick={() => handleAppointmentClick(appointment)}
                          >
                            <div className="flex items-center space-x-3">
                              {getServiceIcon(appointment.serviceType)}
                              <div>
                                <p className="text-[#ffa300] font-medium capitalize">
                                  {appointment.serviceType}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {appointment.startTime} - {appointment.endTime}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-400">
                                {appointment.stallName}
                              </p>
                              <p className={`text-xs ${
                                appointment.status === 'scheduled' ? 'text-blue-400' :
                                appointment.status === 'in_progress' ? 'text-green-400' :
                                appointment.status === 'completed' ? 'text-gray-400' :
                                'text-red-400'
                              }`}>
                                {appointment.status.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Appointment Details Modal */}
        {isAppointmentModalOpen && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#3e2802] rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b border-[#2a1c01]">
                <h3 className="text-xl font-bold text-[#ffa300]">Appointment Details</h3>
                <button 
                  onClick={closeAppointmentModal}
                  className="text-[#ffa300] hover:text-white transition-colors duration-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm text-gray-400">Client</h4>
                      <p className="text-[#ffa300] font-medium">{selectedAppointment.userName}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-400">Service Type</h4>
                      <div className="flex items-center space-x-2">
                        {getServiceIcon(selectedAppointment.serviceType)}
                        <p className="text-[#ffa300] font-medium capitalize">{selectedAppointment.serviceType}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-400">Date</h4>
                      <p className="text-[#ffa300]">{format(selectedAppointment.date, 'EEEE, MMMM d, yyyy')}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-400">Time</h4>
                      <p className="text-[#ffa300]">{selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm text-gray-400">Status</h4>
                      <p className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        selectedAppointment.status === 'scheduled' ? 'bg-blue-900 text-blue-300' :
                        selectedAppointment.status === 'in_progress' ? 'bg-green-900 text-green-300' :
                        selectedAppointment.status === 'completed' ? 'bg-gray-700 text-gray-300' :
                        'bg-red-900 text-red-300'
                      }`}>
                        {selectedAppointment.status.replace('_', ' ')}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-400">Stall</h4>
                      <p className="text-[#ffa300]">{selectedAppointment.stallName}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-400">Appointment ID</h4>
                      <p className="text-[#ffa300] font-mono text-sm">{selectedAppointment.id}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm text-gray-400">Created</h4>
                      <p className="text-[#ffa300]">{format(selectedAppointment.createdAt, 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end space-x-3">
                  <button 
                    onClick={closeAppointmentModal}
                    className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded-md hover:bg-[#2a1c01] transition-colors duration-200"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      // Navigate to admin dashboard with this appointment selected and the correct date
                      const appointmentDate = format(selectedAppointment.date, 'yyyy-MM-dd');
                      router.push(`/admin_dashboard?appointmentId=${selectedAppointment.id}&date=${appointmentDate}`);
                      closeAppointmentModal();
                    }}
                    className="px-4 py-2 bg-[#ffa300] text-[#3e2802] rounded-md hover:bg-[#e69200] transition-colors duration-200"
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