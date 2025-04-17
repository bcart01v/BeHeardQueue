'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc, getDoc, writeBatch, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Appointment, AppointmentWithDetails, HistoricalAppointment, AppointmentStatus } from '@/types/appointment';
import { Company } from '@/types/company';
import { Trailer } from '@/types/trailer';
import { Stall, ServiceType } from '@/types/stall';
import { User } from '@/types/user';
import { format, addDays, isAfter, isBefore, parseISO, addMinutes, isToday, isFuture, startOfDay, isSameDay } from 'date-fns';
import { useAuth } from '@/app/components/AuthContext';
import { useRouter } from 'next/navigation';
import { signOut, updateEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { HaircutAvailability } from '@/types/haircutAvailability';
import Notifications from '../components/Notifications';

interface TimeSlot {
  time: string;
  stallId: string;
  trailerId: string;
  duration: number;
  bufferTime: number;
}

interface TimeSlotAppointment {
  date: Date;
  startTime: string;
  endTime: string;
  stallId: string;
  trailerId: string;
  duration: number;
}

interface BookingFormProps {
  onClose: () => void;
  onSubmit: (appointment: TimeSlotAppointment) => void;
  availableTimeSlots: TimeSlot[];
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedServiceType: ServiceType | null;
  setSelectedServiceType: (type: ServiceType | null) => void;
  userCompany: Company | null;
  isLoading: boolean;
  userLocation: { lat: number; lng: number } | null;
}

// Profile Edit Modal Component
function ProfileEditModal({ 
  isOpen, 
  onClose, 
  user, 
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: User | null; 
  onUpdate: (updatedUser: Partial<User>) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form with user data when modal opens
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Validate form
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        throw new Error('First name, last name, and email are required');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Update user profile
      await onUpdate({
        firstName,
        lastName,
        email,
        phone,
        updatedAt: new Date()
      });

      setSuccess('Profile updated successfully!');
      
      // Keep the success message visible for 2 seconds before closing
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating your profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e1b1b] rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#ffa300]">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="text-[#ffa300] hover:text-[#ffb733]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 text-red-200 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900 text-green-200 rounded-md">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border border-[#3e2802] rounded-md text-[#3e2802] bg-[#ffffff]"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border border-[#3e2802] rounded-md text-[#3e2802] bg-[#ffffff]"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-[#3e2802] rounded-md text-[#3e2802] bg-[#ffffff]"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border border-[#3e2802] rounded-md text-[#3e2802] bg-[#ffffff]"
              placeholder="(123) 456-7890"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#ffa300] rounded-md text-[#ffa300] hover:bg-[#ffa300] hover:text-[#3e2802]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#ffa300] text-[#3e2802] rounded-md hover:bg-[#ffb733] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  isLoading,
  userLocation
}: BookingFormProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableStalls, setAvailableStalls] = useState<Stall[]>([]);
  const [availableTrailers, setAvailableTrailers] = useState<Trailer[]>([]);
  const [isValidating, setIsValidating] = useState(false);

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
          where('serviceType', '==', selectedServiceType)
        );
        const stallsDoc = await getDocs(stallsQuery);
        const stalls = stallsDoc.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stall));
        setAvailableStalls(stalls);

        if (stalls.length === 0) {
          setAvailableTrailers([]);
          return;
        }

        // Get unique trailer IDs from stalls
        const trailerIds = [...new Set(stalls.map(stall => stall.trailerGroup))];
        
        // Only fetch trailers if we have stall IDs
        if (trailerIds.length > 0) {
          // Fetch trailers
          const trailersQuery = query(
            collection(db, 'trailers'),
            where('id', 'in', trailerIds)
          );
          const trailersDoc = await getDocs(trailersQuery);
          const trailers = trailersDoc.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trailer));
          setAvailableTrailers(trailers);
        } else {
          setAvailableTrailers([]);
        }
      } catch (error) {
        console.error('Error fetching available stalls and trailers:', error);
        setError('Failed to load available services. Please try again.');
      }
    };

    fetchAvailableStalls();
  }, [selectedServiceType]);

  // Helper function to check for existing bookings
  const getExistingBookings = async (
    stallId: string,
    date: Date,
    startTime: string,
    duration: number,
    bufferTime: number
  ) => {
    // Create Date objects for the appointment window
    const [hours, minutes] = startTime.split(':').map(Number);
    const appointmentStart = new Date(date);
    appointmentStart.setHours(hours, minutes, 0, 0);

    const appointmentEnd = new Date(appointmentStart);
    appointmentEnd.setMinutes(appointmentEnd.getMinutes() + duration);

    // Add buffer time to the window
    const windowStart = new Date(appointmentStart);
    windowStart.setMinutes(windowStart.getMinutes() - bufferTime);

    const windowEnd = new Date(appointmentEnd);
    windowEnd.setMinutes(windowEnd.getMinutes() + bufferTime);

    // Create a date object set to noon to avoid timezone issues
    const queryDate = new Date(date);
    queryDate.setHours(12, 0, 0, 0);

    // Query for overlapping appointments
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('stallId', '==', stallId),
      where('date', '==', Timestamp.fromMillis(queryDate.getTime())),
      where('status', '==', 'scheduled')
    );

    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    const overlappingAppointments = [];

    for (const doc of appointmentsSnapshot.docs) {
      const appointment = doc.data();
      const [appHours, appMinutes] = appointment.startTime.split(':').map(Number);
      const appStart = new Date(date);
      appStart.setHours(appHours, appMinutes, 0, 0);

      const appEnd = new Date(appStart);
      appEnd.setMinutes(appEnd.getMinutes() + appointment.duration);

      // Check if appointments overlap
      if (
        (appStart <= windowEnd && appEnd >= windowStart) ||
        (appointmentStart <= appEnd && appointmentEnd >= appStart)
      ) {
        overlappingAppointments.push(appointment);
      }
    }

    return overlappingAppointments;
  };

  // Validate time slot when it changes
  useEffect(() => {
    if (selectedTimeSlot) {
      validateTimeSlot(selectedTimeSlot);
    }
  }, [selectedTimeSlot]);

  const validateTimeSlot = async (timeSlot: TimeSlot) => {
    if (!selectedDate || !userCompany) return false;


    // Get stall data
    const stallDoc = await getDoc(doc(db, 'stalls', timeSlot.stallId));
    if (!stallDoc.exists()) {
      console.error('Stall not found');
      return false;
    }

    const stall = stallDoc.data() as Stall;

    // Check if stall is available
    if (stall.status !== 'available') {
      return false;
    }

    // Check if stall belongs to the user's company
    if (stall.companyId !== userCompany.id) {
      return false;
    }

    // Check if the selected date is today or in the future
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

    const selectedDateNoon = new Date(selectedDate);
    selectedDateNoon.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues


    if (selectedDateNoon < today && !isSameDay(today, selectedDateNoon)) {
      return false;
    }

    // Get trailer data
    const trailerDoc = await getDoc(doc(db, 'trailers', timeSlot.trailerId));
    if (!trailerDoc.exists()) {
      console.error('Trailer not found');
      return false;
    }

    const trailer = trailerDoc.data() as Trailer;

    // Check if stall belongs to the selected trailer
    if (stall.trailerGroup !== timeSlot.trailerId) {
      return false;
    }

    // Parse the time
    const [time, period] = timeSlot.time.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    const parsedTime = {
      hour: period === 'PM' && hours !== 12 ? hours + 12 : hours,
      minute: minutes,
      period,
      original: timeSlot.time
    };

    // Create Date objects for comparison
    const appointmentStartTime = new Date(selectedDate);
    appointmentStartTime.setHours(parsedTime.hour, parsedTime.minute, 0, 0);

    const [startHour, startMinute] = trailer.startTime.split(':').map(Number);
    const [endHour, endMinute] = trailer.endTime.split(':').map(Number);

    const trailerStartTime = new Date(selectedDate);
    trailerStartTime.setHours(startHour, startMinute, 0, 0);

    const trailerEndTime = new Date(selectedDate);
    trailerEndTime.setHours(endHour, endMinute, 0, 0);

    // Check if the appointment time is within the trailer's operating hours
    if (appointmentStartTime < trailerStartTime || appointmentStartTime > trailerEndTime) {
      return false;
    }

    // Check for existing bookings
    const existingBookings = await getExistingBookings(
      timeSlot.stallId,
      selectedDate,
      timeSlot.time,
      timeSlot.duration,
      timeSlot.bufferTime
    );

    if (existingBookings.length > 0) {
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot || !selectedServiceType) {
      setError('Please fill in all required fields');
      return;
    }

    // Create appointment object
    const appointment: TimeSlotAppointment = {
      date: selectedDate,
      startTime: selectedTimeSlot.time,
      endTime: addMinutesToTime(selectedTimeSlot.time, selectedTimeSlot.duration),
      stallId: selectedTimeSlot.stallId,
      trailerId: selectedTimeSlot.trailerId,
      duration: selectedTimeSlot.duration
    };

    onSubmit(appointment);
  };

  return (
    <div className="fixed inset-0 bg-[#1e1b1b] bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#ffa300] rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#3e2802]">Book an Appointment</h2>
          <button 
            onClick={onClose}
            className="text-[#3e2802] hover:text-[#2a1c01]"
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
            <label className="block text-sm font-medium text-[#3e2802] mb-2">
              Service Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedServiceType('shower')}
                className={`p-3 rounded-md transition-colors ${
                  selectedServiceType === 'shower'
                    ? 'bg-[#3e2802] text-[#ffa300]'
                    : 'bg-[#ffffff] text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                }`}
              >
                Shower
              </button>
              <button
                type="button"
                onClick={() => setSelectedServiceType('laundry')}
                className={`p-3 rounded-md transition-colors ${
                  selectedServiceType === 'laundry'
                    ? 'bg-[#3e2802] text-[#ffa300]'
                    : 'bg-[#ffffff] text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                }`}
              >
                Laundry
              </button>
              <button
                type="button"
                onClick={() => setSelectedServiceType('haircut')}
                className={`p-3 rounded-md transition-colors ${
                  selectedServiceType === 'haircut'
                    ? 'bg-[#3e2802] text-[#ffa300]'
                    : 'bg-[#ffffff] text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                }`}
              >
                Haircut
              </button>
            </div>
            {!selectedServiceType && (
              <p className="mt-2 text-sm text-red-600">Please select a service type</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#3e2802] mb-1">
              Date *
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                min={format(minDate, 'yyyy-MM-dd')}
                max={format(maxDate, 'yyyy-MM-dd')}
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    // Parse the date string directly to avoid timezone issues
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    // Create a date object with the local timezone
                    const date = new Date(year, month - 1, day);
                    // Set the time to noon to avoid any timezone issues
                    date.setHours(12, 0, 0, 0);
                    setSelectedDate(date);
                  } else {
                    setSelectedDate(null);
                  }
                }}
                className="w-full p-2 border border-[#3e2802] rounded-md text-[#3e2802] bg-[#ffffff]"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  // Set the time to noon to avoid any timezone issues
                  today.setHours(12, 0, 0, 0);
                  setSelectedDate(today);
                }}
                className="px-3 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] transition-colors"
                title="Set to today"
              >
                Today
              </button>
            </div>
            {userCompany?.maxBookingDays && (
              <p className="mt-1 text-xs text-[#3e2802]">
                You can book up to {userCompany.maxBookingDays} days in advance
              </p>
            )}
          </div>

          {selectedDate && selectedServiceType && availableTimeSlots.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#3e2802] mb-2">
                Available Time Slots *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {availableTimeSlots.map((slot) => (
                  <button
                    key={`${slot.time}-${slot.stallId}`}
                    type="button"
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`p-2 text-sm rounded-md transition-colors ${
                      selectedTimeSlot?.time === slot.time && selectedTimeSlot?.stallId === slot.stallId
                        ? 'bg-[#3e2802] text-[#ffa300]'
                        : 'bg-[#ffffff] text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                    }`}
                    disabled={isValidating}
                  >
                    {formatTimeForDisplay(slot.time)}
                  </button>
                ))}
              </div>
              {!selectedTimeSlot && (
                <p className="mt-2 text-sm text-red-600">Please select a time slot</p>
              )}
              {isValidating && (
                <p className="mt-2 text-sm text-[#3e2802]">Validating time slot...</p>
              )}
            </div>
          )}

          {selectedDate && selectedServiceType && availableTimeSlots.length === 0 && (
            <div className="mb-4 p-3 bg-[#3e2802] text-[#ffa300] rounded-md">
              No available time slots for the selected date and service type. Please try another date or service.
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#3e2802] rounded-md text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedDate || !selectedTimeSlot || !selectedServiceType || isValidating}
              className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userCompany, setUserCompany] = useState<Company | null>(null);
  const [companyTrailers, setCompanyTrailers] = useState<Trailer[]>([]);
  const [companyStalls, setCompanyStalls] = useState<Stall[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'messages'>('upcoming');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManualTabSwitch, setIsManualTabSwitch] = useState(false);

  const statusArray: AppointmentStatus[] = ['scheduled', 'in_progress'];
  const completedStatusArray: AppointmentStatus[] = ['cancelled', 'completed', 'missed'];

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
        const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', user.id)));
        if (userDoc.empty) {
          return;
        }
        const userData = userDoc.docs[0].data() as User;
        setCurrentUser(userData);

        // Fetch user's company data if they have a company ID
        if (userData.companyId) {
          const companyDoc = await getDocs(query(collection(db, 'companies'), where('id', '==', userData.companyId)));
          if (!companyDoc.empty) {
            const companyData = companyDoc.docs[0].data() as Company;
            setUserCompany(companyData);

            // Fetch company's trailers
            const trailersQuery = query(collection(db, 'trailers'), where('companyId', '==', companyData.id));
            const trailersSnapshot = await getDocs(trailersQuery);
            const trailers = trailersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trailer));
            setCompanyTrailers(trailers);

            // Fetch company's stalls
            const stallsQuery = query(collection(db, 'stalls'), where('companyId', '==', companyData.id));
            const stallsSnapshot = await getDocs(stallsQuery);
            const stalls = stallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stall));
            setCompanyStalls(stalls);

            // Fetch user's appointments with stall and trailer data
            const appointmentsQuery = query(
              collection(db, 'appointments'),
              where('userId', '==', user.id),
              where('status', 'in', ['scheduled', 'in_progress', 'checked-in'] as AppointmentStatus[]),
              where('date', '>=', Timestamp.fromDate(new Date()))
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
              const firestoreDate = appointmentData.date instanceof Timestamp 
                ? appointmentData.date.toDate()
                : new Date(appointmentData.date);
              

              // Create a new date object preserving the local date
              const date = new Date(
                firestoreDate.getFullYear(),
                firestoreDate.getMonth(),
                firestoreDate.getDate(),
                12, // Set to noon to avoid any timezone issues
                0,
                0,
                0
              );
              
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
          }
        }
      } catch (error) {
        setError('Failed to fetch user data');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserData();
    }
  }, [user, authLoading]);

  // Calculate available time slots when date or service type changes
  useEffect(() => {
    if (!selectedDate || !selectedServiceType || !userCompany) return;

    const calculateAvailableSlots = async () => {
      const availableSlots: TimeSlot[] = [];

      // Format the selected date for comparison
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

      // Get all available stalls for the selected service type
      const availableStalls = companyStalls.filter(stall => 
        stall.serviceType === selectedServiceType
      );

      // Sort trailers by distance if user location is available
      let sortedTrailers = [...companyTrailers];
      if (userLocation) {
        sortedTrailers.sort((a, b) => {
          const [aLat, aLng] = a.location.split(',').map(Number);
          const [bLat, bLng] = b.location.split(',').map(Number);
          const distanceA = calculateDistance(userLocation.lat + ',' + userLocation.lng, a.location);
          const distanceB = calculateDistance(userLocation.lat + ',' + userLocation.lng, b.location);
          return distanceA - distanceB;
        });
      }

      // Calculate time slots for each trailer
      for (const trailer of sortedTrailers) {
        // Parse start and end times
        const [startHour, startMinute] = trailer.startTime.split(':').map(Number);
        const [endHour, endMinute] = trailer.endTime.split(':').map(Number);

        // Create Date objects for start and end times
        // Use a new Date object to avoid modifying the original
        const startTime = new Date(selectedDate);
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(endHour, endMinute, 0, 0);
        // Get stalls for this trailer
        const trailerStalls = availableStalls.filter(stall => stall.trailerGroup === trailer.id);
        
        if (trailerStalls.length === 0) {
          continue;
        }
        
        // Calculate time slots based on stall settings
        for (const stall of trailerStalls) {
          const duration = stall.duration || 30; // Default to 30 minutes if not set
          const bufferTime = stall.bufferTime || 15; // Default to 15 minutes if not set
          const totalSlotDuration = duration + bufferTime;

          let currentTime = startTime;
          while (currentTime < endTime) {
            // Format time in 24-hour format
            const timeSlot = format(currentTime, 'HH:mm');
            
            // Check if this time slot is already booked for this specific stall
            const isBooked = appointments.length > 0 && appointments.some(appointment => {
              const appointmentDate = format(appointment.date, 'yyyy-MM-dd');
              const matches = appointmentDate === selectedDateStr &&
                appointment.startTime === timeSlot &&
                appointment.stallId === stall.id;
              
              return matches;
            });

            if (!isBooked) {
              // Add the time slot with stall and trailer information
              availableSlots.push({
                time: timeSlot,
                stallId: stall.id,
                trailerId: trailer.id,
                duration: duration,
                bufferTime: bufferTime
              });
            }

            // Move to next time slot
            currentTime = new Date(currentTime.getTime() + totalSlotDuration * 60000);
          }
        }
      }

      // Remove duplicate time slots
      const uniqueSlots = availableSlots.filter((slot, index, self) =>
        index === self.findIndex((s) => s.time === slot.time)
      );

      setAvailableTimeSlots(uniqueSlots);
      
      // Show booking form if there are available slots
      if (uniqueSlots.length > 0) {
        setShowBookingForm(true);
      }
    };

    calculateAvailableSlots();
  }, [selectedDate, selectedServiceType, userCompany, companyStalls, companyTrailers, appointments, userLocation]);

  const [userMessages, setUserMessages] = useState<any[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id || activeTab !== 'messages') return;

      const q = query(
        collection(db, 'users', user.id, 'notifications'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUserMessages(messages);
    };

    fetchMessages();
  }, [user, activeTab]);

  // Modify the appointment fetching logic
  const fetchAppointments = async () => {
    if (!currentUser?.id) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create base query for the user's appointments
      let appointmentsQuery;
      
      if (activeTab === 'upcoming') {
        // For upcoming tab: get active appointments (scheduled, in_progress, checked-in)
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', currentUser.id),
          where('status', 'in', ['scheduled', 'in_progress', 'checked-in'] as AppointmentStatus[]),
          where('date', '>=', Timestamp.fromDate(today))
        );
      } else {
        // For past tab: get all appointments before today OR with completed/cancelled/missed status
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', currentUser.id),
          where('status', 'in', ['completed', 'cancelled', 'missed'] as AppointmentStatus[])
        );
      }

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      // Process appointments
      const processedAppointments = await Promise.all(appointmentsSnapshot.docs.map(async docSnapshot => {
        const data = docSnapshot.data();
        const [stallDoc, trailerDoc] = await Promise.all([
          getDoc(doc(db, 'stalls', data.stallId as string)),
          getDoc(doc(db, 'trailers', data.trailerId as string))
        ]);
        
        return {
          id: docSnapshot.id,
          ...data,
          date: data.date.toDate(),
          stall: stallDoc.exists() ? stallDoc.data() as Stall : null,
          trailer: trailerDoc.exists() ? trailerDoc.data() as Trailer : null,
          user: currentUser
        } as AppointmentWithDetails;
      }));

      // Set appointments state with the processed appointments
      setAppointments(processedAppointments);
      
      // Log for debugging
      console.log(`Fetched ${processedAppointments.length} appointments for ${activeTab} tab`);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to fetch appointments');
    }
  };

  // Update the useEffect to use the new fetch function
  useEffect(() => {
    if (!authLoading && currentUser?.id) {
      if (activeTab === 'upcoming' || activeTab === 'past') {
        fetchAppointments();
      }
      // For messages tab, we don't need to fetch appointments
    }
  }, [user, authLoading, activeTab, currentUser]);

  // Add a debug effect to track appointments state
  useEffect(() => {
  }, [appointments]);

  // Reset the manual tab switch flag after a short delay
  useEffect(() => {
    if (isManualTabSwitch) {
      const timer = setTimeout(() => {
        setIsManualTabSwitch(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isManualTabSwitch]);

  const handleBookAppointment = async (appointmentData: TimeSlotAppointment) => {
    if (!user || !userCompany) return;
    
    try {
      setIsLoading(true);
      
      if (!selectedServiceType) {
        toast.error('Service type is required');
        return;
      }
      
      // Create a new date object with the correct local timezone
      const appointmentDate = new Date(appointmentData.date);
      
      // Set the time to noon to avoid timezone issues
      appointmentDate.setHours(12, 0, 0, 0);
      
      // Create appointment object
      const appointment = {
        userId: user.id,
        companyId: userCompany.id,
        stallId: appointmentData.stallId,
        trailerId: appointmentData.trailerId,
        date: appointmentDate,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        status: 'scheduled' as const,
        serviceType: selectedServiceType,
        duration: appointmentData.duration,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Omit<Appointment, 'id'>;
      
      
      // Create Timestamp directly from date components to avoid timezone issues
      const timestamp = Timestamp.fromMillis(appointmentDate.getTime());
      
      // Add appointment to Firestore
      const docRef = await addDoc(collection(db, 'appointments'), {
        ...appointment,
        date: timestamp,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
            
      // Get the stall and trailer for the appointment
      const stallDoc = await getDoc(doc(db, 'stalls', appointment.stallId));
      const trailerDoc = await getDoc(doc(db, 'trailers', appointment.trailerId));
      
      if (!stallDoc.exists() || !trailerDoc.exists()) {
        throw new Error('Stall or trailer not found');
      }
      
      const stall = stallDoc.data() as Stall;
      const trailer = trailerDoc.data() as Trailer;
      
      // Create appointment with details
      const newAppointment: AppointmentWithDetails = {
        id: docRef.id,
        ...appointment,
        user: {
          id: user.id,
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role,
          companyId: user.companyId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        stall: stallDoc.exists() ? stallDoc.data() as Stall : null,
        trailer: trailerDoc.exists() ? trailerDoc.data() as Trailer : null
      };
      
      // Update appointments state
      setAppointments(prev => [...prev, newAppointment]);
      
      // Close booking form
      setShowBookingForm(false);
      
      // Reset form state
      setSelectedDate(null);
      setSelectedServiceType(null);
      setAvailableTimeSlots([]);
      
      // Show success message
      toast.success('Appointment booked successfully!');
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      // Get the appointment document reference directly using the ID
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      // First, get the appointment data to get the stallId
      const appointmentDoc = await getDoc(appointmentRef);
      
      if (!appointmentDoc.exists()) {
        alert('Appointment not found. It may have already been cancelled.');
        return;
      }
      
      const appointmentData = appointmentDoc.data();
      
      // Update the appointment status
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        updatedAt: Timestamp.now()
      });
      
      // Update the stall status back to available
      if (appointmentData.stallId) {
        const stallRef = doc(db, 'stalls', appointmentData.stallId);
        await updateDoc(stallRef, {
          status: 'available',
          updatedAt: Timestamp.now()
        });
      }
      
      // Update local state
      setAppointments(appointments.filter(appointment => appointment.id !== appointmentId));
      
      // Show success message
      toast.success('Appointment cancelled successfully');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      if (error instanceof Error && error.message.includes('No document to update')) {
        toast.error('Appointment not found. It may have already been cancelled.');
      } else {
        toast.error('Failed to cancel appointment. Please try again.');
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return;
  
    try {
      await deleteDoc(doc(db, 'users', user.id, 'notifications', messageId));
      setUserMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
      toast.error('Could not delete message. Please try again.');
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

  const handleUpdateProfile = async (updatedUser: Partial<User>) => {
    if (!currentUser?.id) return;
    
    try {
      // Update user document in Firestore
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, updatedUser);
      
      // Update local state
      setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : null);
      
      // If email was changed, update auth email
      if (updatedUser.email && updatedUser.email !== currentUser.email) {
        // Note: This requires recent authentication, may need to re-authenticate user
        if (auth.currentUser) {
          try {
            await updateEmail(auth.currentUser, updatedUser.email);
          } catch (error) {
            console.error('Error updating email in Firebase Auth:', error);
            // Continue with the profile update even if email update fails
            // The user may need to re-authenticate to change their email
          }
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile. Please try again.');
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      // Get the appointment document reference
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const appointmentDoc = await getDoc(appointmentRef);
      
      if (!appointmentDoc.exists()) {
        toast.error('Appointment not found');
        return;
      }
      
      const appointmentData = appointmentDoc.data();
      
      // Update the appointment status to completed
      await updateDoc(appointmentRef, {
        status: 'completed',
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setAppointments(prev => prev.filter(app => app.id !== appointmentId));
      
      toast.success('Appointment marked as completed');
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Failed to complete appointment');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1e1b1b] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#ffa300] mb-6"></div>
          <p className="text-xl font-medium text-white animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Filter appointments based on active tab
  const filteredAppointments = appointments.filter(appointment => {
    // Create dates set to midnight to avoid timezone issues
    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    
    // Set both dates to midnight
    appointmentDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (activeTab === 'upcoming') {
      // Show future appointments that are active
      return (
        appointmentDate >= today && 
        statusArray.includes(appointment.status) &&
        !completedStatusArray.includes(appointment.status)
      );
    } else {
      // Past tab should show appointments before today plus any cancelled/completed/missed
      return (
        appointmentDate < today || 
        completedStatusArray.includes(appointment.status)
      );
    }
  });

  // Group appointments by date
  const groupedAppointments = filteredAppointments.reduce((groups, appointment) => {
    // Get the date in local timezone using the original date components
    const appointmentDate = new Date(appointment.date);
    const localDate = new Date(
      appointmentDate.getFullYear(),
      appointmentDate.getMonth(),
      appointmentDate.getDate(),
      0, // Set to midnight to avoid timezone issues
      0,
      0,
      0
    );
    
    const date = format(localDate, 'yyyy-MM-dd');
    
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, AppointmentWithDetails[]>);

  // Sort dates in ascending order for upcoming appointments, descending for past
  const sortedDates = Object.keys(groupedAppointments).sort((a, b) => {
    if (activeTab === 'upcoming') {
      return parseISO(a).getTime() - parseISO(b).getTime();
    } else {
      return parseISO(b).getTime() - parseISO(a).getTime();
    }
  });

  // Function to open Google Maps with trailer location
  const openGoogleMaps = (location: string) => {
    if (!location) return;
    
    // Format the location for Google Maps URL
    const formattedLocation = encodeURIComponent(location);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${formattedLocation}`;
    
    // Open in a new tab
    window.open(mapsUrl, '_blank');
  };

  return (
    <>
    <Notifications />
    <div className="min-h-screen bg-[#1e1b1b]">
      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        onUpdate={handleUpdateProfile}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 mt-16">
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <img src="/BeHeardLogo.svg" alt="BeHeard Logo" className="h-24 sm:h-32" />
        </div>

        <div className="bg-[#ffa300] rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8 transform transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-bold text-[#3e2802]">My Appointments</h2>
            <button
              onClick={() => setShowBookingForm(true)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#3e2802] text-[#ffffff] rounded-lg hover:bg-[#2a1c01] transition-colors duration-300 flex items-center text-sm sm:text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Book New Appointment
            </button>
          </div>
          
          {/* Tabs for upcoming and past appointments */}
          <div className="border-b border-[#3e2802] mb-4 sm:mb-6">
            <nav className="flex -mb-px">
              <button
                onClick={() => {
                  setIsManualTabSwitch(true);
                  setActiveTab('upcoming');
                }}
                className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-[#3e2802] text-[#3e2802]'
                    : 'border-transparent text-[#3e2802] hover:text-[#2a1c01] hover:border-[#2a1c01]'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => {
                  setIsManualTabSwitch(true);
                  setActiveTab('past');
                }}
                className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'past'
                    ? 'border-[#3e2802] text-[#3e2802]'
                    : 'border-transparent text-[#3e2802] hover:text-[#2a1c01] hover:border-[#2a1c01]'
                }`}
              >
                Past
              </button>
              <button
                onClick={() => {
                  setActiveTab('messages');
                }}
                className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'messages'
                    ? 'border-[#3e2802] text-[#3e2802]'
                    : 'border-transparent text-[#3e2802] hover:text-[#2a1c01] hover:border-[#2a1c01]'
                }`}
                >
                  Messages
                </button>
            </nav>
          </div>

          {activeTab === 'messages' && (
            <div className="space-y-4">
              {userMessages.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="bg-[#3e2802] rounded-full p-3 sm:p-4 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-[#ffa300]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base text-[#ffffff] mb-3 sm:mb-4">You don't have any messages yet</p>
                  <p className="text-xs sm:text-sm text-white-400">When you receive notifications or updates, they will appear here.</p>
                </div>
              ) : (
                userMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-[#3e2802] text-white border border-[#ffa300] rounded p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{msg.message}</p>
                        <p className="text-sm text-gray-300 mt-1">
                          {msg.createdAt?.toDate
                            ? msg.createdAt.toDate().toLocaleString()
                            : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-red-500 font-bold hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {(activeTab === 'upcoming' || activeTab === 'past') && (
            <>
              {sortedDates.length > 0 ? (
                <div className="space-y-6">
                  {sortedDates.map((date) => (
                    <div key={date} className="border border-[#3e2802] rounded-xl p-3 sm:p-5 bg-[#3e2802]">
                      <h3 className="text-lg sm:text-xl font-bold text-[#ffffff] mb-3">
                        {format(parseISO(date), 'MMMM d, yyyy')}
                      </h3>
                      <div className="space-y-3">
                        {groupedAppointments[date].map((appointment) => (
                          <div 
                            key={appointment.id} 
                            className="border border-[#ffa300] rounded-lg p-3 bg-[#2a1c01] hover:shadow-md transition-all duration-300"
                          >
                            <div className="flex flex-col space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[#ffa300] font-medium capitalize">{appointment.serviceType}</p>
                                  <p className="text-white text-sm">{formatTimeForDisplay(appointment.startTime)} - {formatTimeForDisplay(appointment.endTime)}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  (() => {
                                    switch(appointment.status as AppointmentStatus) {
                                      case 'scheduled':
                                        return 'bg-blue-100 text-blue-800';
                                      case 'in_progress':
                                        return 'bg-yellow-100 text-yellow-800';
                                      case 'completed':
                                        return 'bg-green-100 text-green-800';
                                      case 'missed':
                                        return 'bg-red-100 text-red-800';
                                      case 'cancelled':
                                        return 'bg-gray-100 text-gray-800';
                                      default:
                                        return 'bg-gray-100 text-gray-800';
                                    }
                                  })()
                                }`}>
                                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center text-sm text-[#ffffff]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {appointment.startTime}
                              </div>
                              <div className="flex items-center text-sm text-[#ffffff]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {appointment.trailer?.location || 'Location Unavailable'}
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <button
                                  onClick={() => openGoogleMaps(appointment.trailer?.location || '')}
                                  className="px-2 py-1 bg-[#ffa300] text-[#3e2802] rounded-lg hover:bg-[#ffb733] transition-colors duration-300 flex items-center text-xs"
                                  disabled={!appointment.trailer?.location}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                  </svg>
                                  Take me there
                                </button>
                                {appointment.status === 'in_progress' && (
                                  <button
                                    onClick={() => handleCompleteAppointment(appointment.id)}
                                    className="px-2 py-1 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors duration-300 flex items-center text-xs"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Complete
                                  </button>
                                )}
                                {appointment.status === 'scheduled' && (
                                  <button
                                    onClick={() => handleCancelAppointment(appointment.id)}
                                    className="px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors duration-300 flex items-center text-xs"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <div className="bg-[#3e2802] rounded-full p-3 sm:p-4 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-[#ffa300]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base text-[#ffffff] mb-3 sm:mb-4">You don't have any {activeTab} appointments</p>
                  {activeTab === 'upcoming' && (
                    <button
                      onClick={() => setShowBookingForm(true)}
                      className="bg-[#3e2802] text-[#ffa300] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-[#2a1c01] transition-colors duration-300 flex items-center mx-auto text-sm sm:text-base"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Book an Appointment
                    </button>
                  )}
                </div>
              )}
            </>
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
          userLocation={userLocation}
        />
      )}
    </div>
    </>
  );
}

function addMinutesToTime(time: string, minutes: number): string {
  // Parse the time string (format "h:mm AM/PM")
  const [timeStr, period] = time.split(' ');
  const [hours, mins] = timeStr.split(':').map(Number);
  
  // Convert to 24-hour format
  let totalHours = hours;
  if (period === 'PM' && hours !== 12) {
    totalHours += 12;
  } else if (period === 'AM' && hours === 12) {
    totalHours = 0;
  }
  
  // Calculate total minutes and handle overflow
  const totalMinutes = mins + minutes;
  const newHours = totalHours + Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  
  // Format the time in 24-hour format (HH:mm)
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

// Helper function to format time for display
function formatTimeForDisplay(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function calculateDistance(point1: string, point2: string): number {
  // Parse the location strings (assuming format "lat,lng")
  const [lat1, lng1] = point1.split(',').map(Number);
  const [lat2, lng2] = point2.split(',').map(Number);
  
  // Haversine formula to calculate distance between two points on Earth
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(value: number): number {
  return value * Math.PI / 180;
}
