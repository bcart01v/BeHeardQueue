'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Appointment, AppointmentWithDetails } from '@/types/appointment';
import { Company } from '@/types/company';
import { Trailer } from '@/types/trailer';
import { Stall, ServiceType } from '@/types/stall';
import { User } from '@/types/user';
import { format, addDays, isAfter, isBefore, parseISO, addMinutes, isToday, isFuture, startOfDay } from 'date-fns';
import { useAuth } from '@/app/components/AuthContext';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Booking Form Component
function BookingForm({ 
  onClose, 
  onSubmit, 
  availableTimeSlots, 
  selectedDate, 
  setSelectedDate, 
  selectedServiceType, 
  setSelectedServiceType,
  userCompany,
  isLoading
}: { 
  onClose: () => void; 
  onSubmit: (appointment: Partial<Appointment>) => void; 
  availableTimeSlots: string[]; 
  selectedDate: Date | null; 
  setSelectedDate: (date: Date | null) => void; 
  selectedServiceType: ServiceType | null; 
  setSelectedServiceType: (type: ServiceType | null) => void;
  userCompany: Company | null;
  isLoading: boolean;
}) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableStalls, setAvailableStalls] = useState<Stall[]>([]);
  const [availableTrailers, setAvailableTrailers] = useState<Trailer[]>([]);

  // Calculate min and max dates based on company settings
  const minDate = new Date();
  const maxDate = userCompany?.maxBookingDays 
    ? addDays(new Date(), userCompany.maxBookingDays) 
    : addDays(new Date(), 30); // Default to 30 days if not set

  // Filter available stalls and trailers when service type changes
  useEffect(() => {
    if (!selectedServiceType) {
      setAvailableStalls([]);
      setAvailableTrailers([]);
      return;
    }

    // Fetch available stalls for the selected service type
    const fetchAvailableStalls = async () => {
      try {
        const stallsQuery = query(
          collection(db, 'stalls'),
          where('serviceType', '==', selectedServiceType),
          where('status', '==', 'available')
        );
        const stallsDoc = await getDocs(stallsQuery);
        const stalls = stallsDoc.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stall));
        setAvailableStalls(stalls);

        // Get unique trailer IDs from stalls
        const trailerIds = [...new Set(stalls.map(stall => stall.trailerGroup))];
        
        // Fetch trailers
        const trailersQuery = query(
          collection(db, 'trailers'),
          where('id', 'in', trailerIds)
        );
        const trailersDoc = await getDocs(trailersQuery);
        const trailers = trailersDoc.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trailer));
        setAvailableTrailers(trailers);
      } catch (error) {
        console.error('Error fetching available stalls and trailers:', error);
        setError('Failed to load available services. Please try again.');
      }
    };

    fetchAvailableStalls();
  }, [selectedServiceType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot || !selectedServiceType) {
      setError('Please fill in all required fields');
      return;
    }

    // Auto-assign a stall and trailer
    if (availableStalls.length === 0 || availableTrailers.length === 0) {
      setError('No available stalls or trailers for this service type');
      return;
    }

    // Find the first available stall
    const selectedStall = availableStalls[0];
    const selectedTrailer = availableTrailers.find(t => t.id === selectedStall.trailerGroup);

    if (!selectedTrailer) {
      setError('Could not find a matching trailer for the selected stall');
      return;
    }

    // Create appointment object
    const appointment: Partial<Appointment> = {
      date: selectedDate,
      startTime: selectedTimeSlot,
      stallId: selectedStall.id,
      trailerId: selectedTrailer.id,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onSubmit(appointment);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black">Book an Appointment</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-1">
              Service Type *
            </label>
            <select
              value={selectedServiceType || ''}
              onChange={(e) => setSelectedServiceType(e.target.value as ServiceType)}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
            >
              <option value="">Select a service</option>
              <option value="shower">Shower</option>
              <option value="laundry">Laundry</option>
              <option value="haircut">Haircut</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-1">
              Date *
            </label>
            <input
              type="date"
              min={format(minDate, 'yyyy-MM-dd')}
              max={format(maxDate, 'yyyy-MM-dd')}
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  // Parse the date string directly to avoid timezone issues
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  setSelectedDate(date);
                } else {
                  setSelectedDate(null);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
            />
            {userCompany?.maxBookingDays && (
              <p className="mt-1 text-xs text-black">
                You can book up to {userCompany.maxBookingDays} days in advance
              </p>
            )}
          </div>

          {selectedDate && selectedServiceType && availableTimeSlots.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-2">
                Available Time Slots *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {availableTimeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`p-2 text-sm rounded-md transition-colors ${
                      selectedTimeSlot === slot
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-black hover:bg-gray-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {!selectedTimeSlot && (
                <p className="mt-2 text-sm text-red-600">Please select a time slot</p>
              )}
            </div>
          )}

          {selectedDate && selectedServiceType && availableTimeSlots.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
              No available time slots for the selected date and service type. Please try another date or service.
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedDate || !selectedTimeSlot || !selectedServiceType}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userCompany, setUserCompany] = useState<Company | null>(null);
  const [companyTrailers, setCompanyTrailers] = useState<Trailer[]>([]);
  const [companyStalls, setCompanyStalls] = useState<Stall[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Get user's location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to get your location. Some features may be limited.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch user's appointments and company data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;
      
      try {
        console.log('Fetching user data for ID:', user.id);
        const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', user.id)));
        if (userDoc.empty) {
          console.error('No user found with ID:', user.id);
          return;
        }
        const userData = userDoc.docs[0].data() as User;
        console.log('User data:', userData);
        setCurrentUser(userData);

        // Fetch user's company data if they have a company ID
        if (userData.companyId) {
          console.log('Fetching company data for ID:', userData.companyId);
          const companyDoc = await getDocs(query(collection(db, 'companies'), where('id', '==', userData.companyId)));
          if (!companyDoc.empty) {
            const companyData = companyDoc.docs[0].data() as Company;
            console.log('Company data:', companyData);
            setUserCompany(companyData);

            // Fetch company's trailers
            console.log('Fetching trailers for company:', companyData.id);
            const trailersQuery = query(collection(db, 'trailers'), where('companyId', '==', companyData.id));
            const trailersSnapshot = await getDocs(trailersQuery);
            const trailers = trailersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trailer));
            console.log('Trailers:', trailers);
            setCompanyTrailers(trailers);

            // Fetch company's stalls
            console.log('Fetching stalls for company:', companyData.id);
            const stallsQuery = query(collection(db, 'stalls'), where('companyId', '==', companyData.id));
            const stallsSnapshot = await getDocs(stallsQuery);
            const stalls = stallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stall));
            console.log('Stalls:', stalls);
            setCompanyStalls(stalls);

            // Fetch user's appointments with stall and trailer data
            const appointmentsQuery = query(
              collection(db, 'appointments'),
              where('userId', '==', user.id),
              where('status', 'in', ['scheduled', 'in_progress'])
            );
            const appointmentsSnapshot = await getDocs(appointmentsQuery);
            const appointmentsData = await Promise.all(appointmentsSnapshot.docs.map(async (doc) => {
              const appointmentData = doc.data();
              
              // Fetch stall data
              const stallDoc = await getDocs(query(collection(db, 'stalls'), where('id', '==', appointmentData.stallId)));
              const stall = stallDoc.empty ? null : { id: stallDoc.docs[0].id, ...stallDoc.docs[0].data() } as Stall;
              
              // Fetch trailer data
              const trailerDoc = await getDocs(query(collection(db, 'trailers'), where('id', '==', appointmentData.trailerId)));
              const trailer = trailerDoc.empty ? null : { id: trailerDoc.docs[0].id, ...trailerDoc.docs[0].data() } as Trailer;
              
              // Convert Firestore Timestamp to Date
              const date = appointmentData.date instanceof Timestamp 
                ? appointmentData.date.toDate() 
                : new Date(appointmentData.date);
              
              return {
                id: doc.id,
                ...appointmentData,
                date,
                stall,
                trailer,
                user: userData
              } as AppointmentWithDetails;
            }));

            setAppointments(appointmentsData);
          } else {
            console.error('No company found with ID:', userData.companyId);
          }
        } else {
          console.error('User has no company ID');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
        // Add a small delay before showing the page to allow for animations
        setTimeout(() => setIsPageLoaded(true), 300);
      }
    };

    if (!authLoading) {
      fetchUserData();
    }
  }, [user, authLoading]);

  // Calculate available time slots when date and service type are selected
  useEffect(() => {
    if (!selectedDate || !selectedServiceType || !userCompany) return;

    const calculateAvailableSlots = async () => {
      console.log('Calculating available slots for:', {
        date: format(selectedDate, 'yyyy-MM-dd'),
        serviceType: selectedServiceType,
        companyId: userCompany.id
      });

      const availableSlots: string[] = [];
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayIndex = selectedDate.getDay();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[dayIndex];

      console.log('Day of week:', dayOfWeek);
      console.log('Company open days:', userCompany.openDays);

      // Check if the selected day is an open day for the company
      if (!userCompany.openDays[dayOfWeek as keyof typeof userCompany.openDays]) {
        console.log('Selected day is not an open day');
        setAvailableTimeSlots([]);
        return;
      }

      // Get all stalls of the selected service type
      const availableStalls = companyStalls.filter(stall => {
        console.log('Checking stall:', stall.id, {
          serviceType: stall.serviceType,
          selectedServiceType,
          trailerGroup: stall.trailerGroup
        });
        return stall.serviceType === selectedServiceType; // Only filter by service type, ignore status
      });

      console.log('Available stalls:', availableStalls);

      // Get all trailers that have these stalls
      const relevantTrailers = companyTrailers.filter(trailer => {
        const hasMatchingStall = availableStalls.some(stall => stall.trailerGroup === trailer.id);
        console.log('Checking trailer:', trailer.id, {
          hasMatchingStall,
          stallGroups: availableStalls.map(s => s.trailerGroup)
        });
        return hasMatchingStall;
      });

      console.log('Relevant trailers:', relevantTrailers);

      if (relevantTrailers.length === 0) {
        console.log('No relevant trailers found');
        setAvailableTimeSlots([]);
        return;
      }

      // Sort trailers by distance if location is available
      let sortedTrailers = [...relevantTrailers];
      if (userLocation) {
        sortedTrailers.sort((a, b) => {
          const distanceA = calculateDistance(userLocation, a.location);
          const distanceB = calculateDistance(userLocation, b.location);
          return distanceA - distanceB;
        });
      }

      // Calculate time slots for each trailer
      for (const trailer of sortedTrailers) {
        console.log('Processing trailer:', trailer.id, {
          startTime: trailer.startTime,
          endTime: trailer.endTime,
          duration: trailer.duration,
          bufferTime: trailer.bufferTime
        });

        // Parse start and end times
        const [startHour, startMinute] = trailer.startTime.split(':').map(Number);
        const [endHour, endMinute] = trailer.endTime.split(':').map(Number);

        // Create Date objects for start and end times
        const startTime = new Date(selectedDate);
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(endHour, endMinute, 0, 0);

        const duration = trailer.duration || 30; // Default to 30 minutes if not set
        const bufferTime = trailer.bufferTime || 15; // Default to 15 minutes if not set
        const totalSlotDuration = duration + bufferTime;

        let currentTime = startTime;
        while (currentTime < endTime) {
          // Format time in 12-hour format with AM/PM
          const timeSlot = format(currentTime, 'h:mm a');
          
          // Check if this time slot is already booked
          const isBooked = appointments.some(appointment => 
            format(appointment.date, 'yyyy-MM-dd') === selectedDateStr &&
            appointment.startTime === timeSlot
          );

          if (!isBooked) {
            availableSlots.push(timeSlot);
          }

          // Move to next time slot
          currentTime = new Date(currentTime.getTime() + totalSlotDuration * 60000);
        }
      }

      console.log('Available slots before deduplication:', availableSlots);
      // Remove duplicates and sort
      const uniqueSlots = [...new Set(availableSlots)].sort((a, b) => {
        // Custom sort function to handle 12-hour time format
        const timeA = new Date(`1970-01-01 ${a}`);
        const timeB = new Date(`1970-01-01 ${b}`);
        return timeA.getTime() - timeB.getTime();
      });
      console.log('Final available slots:', uniqueSlots);
      setAvailableTimeSlots(uniqueSlots);
    };

    calculateAvailableSlots();
  }, [selectedDate, selectedServiceType, companyStalls, companyTrailers, appointments, userCompany, userLocation]);

  const handleBookAppointment = async (appointment: Partial<Appointment>) => {
    if (!currentUser?.id || !currentUser?.companyId) {
      alert('User information is missing. Please try again.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user's location
      let userLocation = null;
      if (navigator.geolocation) {
        userLocation = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.error('Error getting location:', error);
              resolve(null);
            }
          );
        });
      }
      
      // Find available stalls for the selected service type
      const availableStalls = companyStalls.filter(stall => 
        stall.serviceType === selectedServiceType
      );

      if (availableStalls.length === 0) {
        throw new Error('No available stalls found for the selected service type');
      }

      // Find trailers that have these stalls
      const relevantTrailers = companyTrailers.filter(trailer => 
        availableStalls.some(stall => stall.trailerGroup === trailer.id)
      );

      if (relevantTrailers.length === 0) {
        throw new Error('No available trailers found for the selected service type');
      }

      // Sort trailers by distance if location is available
      let sortedTrailers = [...relevantTrailers];
      if (userLocation) {
        sortedTrailers.sort((a, b) => {
          const distanceA = calculateDistance(userLocation, a.location);
          const distanceB = calculateDistance(userLocation, b.location);
          return distanceA - distanceB;
        });
      }

      // Select the first available stall and its corresponding trailer
      const selectedStall = availableStalls[0];
      const selectedTrailer = sortedTrailers.find(t => t.id === selectedStall.trailerGroup);

      if (!selectedTrailer) {
        throw new Error('Could not find a matching trailer for the selected stall');
      }

      // Create a new appointment
      const newAppointment: AppointmentWithDetails = {
        id: crypto.randomUUID(), // Generate a unique ID
        userId: currentUser.id,
        stallId: selectedStall.id,
        trailerId: selectedTrailer.id,
        date: new Date(appointment.date as Date),
        startTime: appointment.startTime || selectedTrailer.startTime,
        endTime: appointment.startTime 
          ? addMinutesToTime(appointment.startTime, selectedTrailer.duration)
          : selectedTrailer.endTime,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: currentUser,
        stall: selectedStall,
        trailer: selectedTrailer
      };

      // Add the appointment to Firestore
      const appointmentRef = await addDoc(collection(db, 'appointments'), {
        ...newAppointment,
        date: Timestamp.fromDate(newAppointment.date),
        createdAt: Timestamp.fromDate(newAppointment.createdAt),
        updatedAt: Timestamp.fromDate(newAppointment.updatedAt)
      });

      // Update local state with the new appointment
      setAppointments(prev => [...prev, newAppointment]);

      // Show success message with distance if available
      if (userLocation) {
        const distance = calculateDistance(userLocation, selectedTrailer.location);
        alert(`Appointment booked successfully! The trailer is ${distance.toFixed(1)} km away from your location.`);
      } else {
        alert('Appointment booked successfully!');
      }

      setSelectedDate(null);
      setSelectedTime('');
      setShowBookingForm(false);
      
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert(error instanceof Error ? error.message : 'Failed to book appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      // Get the appointment document reference directly using the ID
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      // Update the appointment status
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setAppointments(appointments.filter(appointment => appointment.id !== appointmentId));
      
      // Show success message
      alert('Appointment cancelled successfully');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      if (error instanceof Error && error.message.includes('No document to update')) {
        alert('Appointment not found. It may have already been cancelled.');
      } else {
        alert('Failed to cancel appointment. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-6"></div>
          <p className="text-xl font-medium text-gray-700 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Filter appointments based on active tab
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (activeTab === 'upcoming') {
      return appointmentDate >= today;
    } else {
      return appointmentDate < today;
    }
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-4 sm:py-8 transition-opacity duration-500 ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header with title, user name, and logout button */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8 transform transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center">
              <div className="bg-blue-600 rounded-full p-2 sm:p-3 mr-3 sm:mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">BeHeard Queue</h1>
            </div>
            
            {currentUser && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
                <div className="text-left sm:text-right">
                  <p className="text-sm text-gray-500">Welcome back,</p>
                  <p className="font-semibold text-lg sm:text-xl text-gray-800">
                    {currentUser.firstName} {currentUser.lastName}
                  </p>
                  {userLocation && (
                    <p className="text-xs text-gray-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Location available
                    </p>
                  )}
                  {locationError && (
                    <p className="text-xs text-red-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {locationError}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 flex items-center text-sm sm:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Debug information - Show when either date or service type is selected */}
        {(selectedDate || selectedServiceType) && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8 z-10 relative transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-3 sm:mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Debug Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">Selected Date: <span className="text-blue-600">{selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'Not selected'}</span></p>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">Service Type: <span className="text-blue-600">{selectedServiceType || 'Not selected'}</span></p>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">Available Stalls: <span className="text-blue-600">{companyStalls.filter(s => s.serviceType === selectedServiceType).length}</span></p>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">Available Trailers: <span className="text-blue-600">{companyTrailers.length}</span></p>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">User Location: <span className="text-blue-600">{userLocation ? 'Available' : 'Not Available'}</span></p>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">Available Time Slots: <span className="text-blue-600">{availableTimeSlots.length}</span></p>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">Show Booking Form: <span className="text-blue-600">{showBookingForm ? 'Yes' : 'No'}</span></p>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">User Company ID: <span className="text-blue-600">{currentUser?.companyId || 'None'}</span></p>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="font-medium text-gray-700">Company ID: <span className="text-blue-600">{userCompany?.id || 'None'}</span></p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8 transform transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">My Appointments</h2>
            <button
              onClick={() => setShowBookingForm(true)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Book New Appointment
            </button>
          </div>
          
          {/* Tabs for upcoming and past appointments */}
          <div className="border-b border-gray-200 mb-4 sm:mb-6">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'past'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Past
              </button>
            </nav>
          </div>
          
          {filteredAppointments.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {filteredAppointments.map((appointment, index) => (
                <div 
                  key={appointment.id} 
                  className="border rounded-xl p-3 sm:p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start md:items-center">
                    <div className="mb-2 sm:mb-0">
                      <div className="flex items-center mb-1 sm:mb-2">
                        <h3 className="text-base sm:text-lg font-medium text-gray-800">
                          {appointment.stall?.serviceType 
                            ? appointment.stall.serviceType.charAt(0).toUpperCase() + appointment.stall.serviceType.slice(1)
                            : 'Service Type Unavailable'}
                        </h3>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {appointment.date instanceof Date 
                          ? format(appointment.date, 'MMMM d, yyyy')
                          : 'Date Unavailable'} at {appointment.startTime}
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {appointment.trailer?.location || 'Location Unavailable'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelAppointment(appointment.id)}
                      className="px-2 py-1 sm:px-3 sm:py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors duration-300 flex items-center text-xs sm:text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="bg-gray-100 rounded-full p-3 sm:p-4 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">You don't have any {activeTab} appointments</p>
              {activeTab === 'upcoming' && (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center mx-auto text-sm sm:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Book an Appointment
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showBookingForm && (
        <BookingForm
          onClose={() => setShowBookingForm(false)}
          onSubmit={handleBookAppointment}
          availableTimeSlots={availableTimeSlots}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedServiceType={selectedServiceType}
          setSelectedServiceType={setSelectedServiceType}
          userCompany={userCompany}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

function addMinutesToTime(time: string, minutes: number): string {
  // Parse the time string (assuming format "h:mm a" or "h:mm p")
  const [timeStr, period] = time.split(' ');
  const [hours, mins] = timeStr.split(':').map(Number);
  
  // Create a date object with the time
  const date = new Date();
  date.setHours(hours + (period.toLowerCase() === 'pm' && hours !== 12 ? 12 : 0), mins + minutes);
  
  // Format the time in 12-hour format
  return format(date, 'h:mm a');
}

function calculateDistance(point1: { lat: number; lng: number }, point2: string): number {
  // Parse the location string (assuming format "lat,lng")
  const [lat, lng] = point2.split(',').map(Number);
  
  // Haversine formula to calculate distance between two points on Earth
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat - point1.lat);
  const dLon = toRad(lng - point1.lng);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(value: number): number {
  return value * Math.PI / 180;
}
