'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Appointment, AppointmentWithDetails } from '@/types/appointment';
import { Company } from '@/types/company';
import { Trailer } from '@/types/trailer';
import { Stall, ServiceType } from '@/types/stall';
import { User } from '@/types/user';
import { format, addDays, isAfter, isBefore, parseISO, addMinutes, isToday, isFuture, startOfDay } from 'date-fns';
import { useAuth } from '@/app/components/AuthContext';
import { useRouter } from 'next/navigation';
import { signOut, updateEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { HaircutAvailability } from '@/types/haircutAvailability';

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
}: { 
  onClose: () => void; 
  onSubmit: (appointment: Partial<Appointment>) => void; 
  availableTimeSlots: { time: string; stallId: string; trailerId: string; duration: number; bufferTime: number }[]; 
  selectedDate: Date | null; 
  setSelectedDate: (date: Date | null) => void; 
  selectedServiceType: ServiceType | null; 
  setSelectedServiceType: (type: ServiceType | null) => void;
  userCompany: Company | null;
  isLoading: boolean;
  userLocation: { lat: number; lng: number } | null;
}) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    time: string;
    stallId: string;
    trailerId: string;
    duration: number;
    bufferTime: number;
  } | null>(null);
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
          console.log('No stalls found for service type:', selectedServiceType);
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

  // Validate time slot selection when it changes
  useEffect(() => {
    if (selectedTimeSlot) {
      validateTimeSlot(selectedTimeSlot);
    }
  }, [selectedTimeSlot]);

  const validateTimeSlot = async (slot: {
    time: string;
    stallId: string;
    trailerId: string;
    duration: number;
    bufferTime: number;
  }) => {
    setIsValidating(true);
    setError(null);
    
    try {
      console.log('Validating time slot:', slot);
      
      // Check if the stall exists
      const stallDoc = await getDoc(doc(db, 'stalls', slot.stallId));
      if (!stallDoc.exists()) {
        console.log('Stall not found:', slot.stallId);
        setError('Selected stall not found');
        setSelectedTimeSlot(null);
        return;
      }
      
      const stall = stallDoc.data() as Stall;
      console.log('Stall data:', stall);
      
      // Only check stall status for same-day bookings
      const today = new Date();
      const isSameDay = selectedDate && 
        today.getFullYear() === selectedDate.getFullYear() &&
        today.getMonth() === selectedDate.getMonth() &&
        today.getDate() === selectedDate.getDate();
      
      if (isSameDay && stall.status !== 'available') {
        console.log('Stall status is not available for same-day booking:', stall.status);
        setError('Selected stall is not available');
        setSelectedTimeSlot(null);
        return;
      }
      
      if (stall.serviceType !== selectedServiceType) {
        console.log('Stall service type mismatch:', stall.serviceType, 'vs', selectedServiceType);
        setError('Selected stall does not provide the requested service type');
        setSelectedTimeSlot(null);
        return;
      }
      
      // Check if the trailer exists
      const trailerDoc = await getDoc(doc(db, 'trailers', slot.trailerId));
      if (!trailerDoc.exists()) {
        console.log('Trailer not found:', slot.trailerId);
        setError('Selected trailer not found');
        setSelectedTimeSlot(null);
        return;
      }
      
      const trailer = trailerDoc.data() as Trailer;
      console.log('Trailer data:', trailer);
      
      // Check if the stall belongs to the trailer
      console.log('Stall trailer group:', stall.trailerGroup, 'vs selected trailer ID:', slot.trailerId);
      if (stall.trailerGroup !== slot.trailerId) {
        console.log('Stall does not belong to the selected trailer');
        setError('Selected stall does not belong to the selected trailer');
        setSelectedTimeSlot(null);
        return;
      }
      
      // Check if the time slot is within the trailer's operating hours
      const [startHour, startMinute] = trailer.startTime.split(':').map(Number);
      const [endHour, endMinute] = trailer.endTime.split(':').map(Number);
      
      const trailerStartTime = new Date(selectedDate as Date);
      trailerStartTime.setHours(startHour, startMinute, 0, 0);
      
      const trailerEndTime = new Date(selectedDate as Date);
      trailerEndTime.setHours(endHour, endMinute, 0, 0);
      
      const appointmentStartTime = new Date(selectedDate as Date);
      // Parse time in 12-hour format with AM/PM
      const timeParts = slot.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) {
        console.log('Invalid time format:', slot.time);
        setError('Invalid time format');
        setSelectedTimeSlot(null);
        return;
      }
      
      let [_, hours, minutes, period] = timeParts;
      let hour = parseInt(hours);
      const minute = parseInt(minutes);
      
      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && hour < 12) {
        hour += 12;
      } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
      }
      
      console.log('Parsed time:', { hour, minute, period, original: slot.time });
      appointmentStartTime.setHours(hour, minute, 0, 0);
      
      console.log('Time comparison:', {
        appointmentStartTime: appointmentStartTime.toLocaleTimeString(),
        trailerStartTime: trailerStartTime.toLocaleTimeString(),
        trailerEndTime: trailerEndTime.toLocaleTimeString(),
        isBeforeStart: appointmentStartTime < trailerStartTime,
        isAfterEnd: appointmentStartTime > trailerEndTime
      });
      
      if (appointmentStartTime < trailerStartTime || appointmentStartTime > trailerEndTime) {
        console.log('Time slot is outside the trailer\'s operating hours');
        setError('Selected time slot is outside the trailer\'s operating hours');
        setSelectedTimeSlot(null);
        return;
      }
      
      // Check if the time slot is already booked
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('date', '==', Timestamp.fromDate(selectedDate as Date)),
        where('stallId', '==', slot.stallId),
        where('startTime', '==', slot.time),
        where('status', '==', 'scheduled')
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      if (!appointmentsSnapshot.empty) {
        setError('Selected time slot is already booked');
        setSelectedTimeSlot(null);
        return;
      }
      
      // If we get here, the time slot is valid
      console.log('Time slot is valid:', slot);
    } catch (error) {
      console.error('Error validating time slot:', error);
      setError('An error occurred while validating the time slot');
      setSelectedTimeSlot(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot || !selectedServiceType) {
      setError('Please fill in all required fields');
      return;
    }

    // Create appointment object
    const appointment: Partial<Appointment> = {
      date: selectedDate,
      startTime: selectedTimeSlot.time,
      endTime: addMinutesToTime(selectedTimeSlot.time, selectedTimeSlot.duration),
      stallId: selectedTimeSlot.stallId,
      trailerId: selectedTimeSlot.trailerId,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date()
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
                    const date = new Date(year, month - 1, day);
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
                onClick={() => setSelectedDate(new Date())}
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
                    {slot.time}
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
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{
    time: string;
    stallId: string;
    trailerId: string;
    duration: number;
    bufferTime: number;
  }[]>([]);
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const availableSlots: {
        time: string;
        stallId: string;
        trailerId: string;
        duration: number;
        bufferTime: number;
      }[] = [];

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
            // Format time in 12-hour format with AM/PM
            const timeSlot = format(currentTime, 'h:mm a');
            
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

  const fetchAppointments = async () => {
    try {
      if (!currentUser?.id) return;

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', currentUser.id),
        where('status', '==', 'scheduled')
      );

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointments = await Promise.all(appointmentsSnapshot.docs.map(async docSnapshot => {
        const data = docSnapshot.data();
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        const stallDoc = await getDoc(doc(db, 'stalls', data.stallId));
        const trailerDoc = await getDoc(doc(db, 'trailers', data.trailerId));

        return {
          id: docSnapshot.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          user: userDoc.data() as User,
          stall: stallDoc.data() as Stall,
          trailer: trailerDoc.data() as Trailer
        } as AppointmentWithDetails;
      }));

      setAppointments(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to fetch appointments');
    }
  };

  const handleBookAppointment = async (appointmentData: Partial<Appointment>) => {
    if (!user || !userCompany) return;
    
    try {
      setIsLoading(true);
      
      if (!selectedServiceType) {
        toast.error('Service type is required');
        return;
      }
      
      // Create appointment object
      const appointment: Omit<Appointment, 'id'> = {
        userId: user.id,
        companyId: userCompany.id,
        stallId: appointmentData.stallId as string,
        trailerId: appointmentData.trailerId as string,
        date: appointmentData.date as Date,
        startTime: appointmentData.startTime as string,
        endTime: appointmentData.endTime as string,
        status: 'scheduled',
        serviceType: selectedServiceType,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Creating appointment with data:', appointment);
      
      // Add appointment to Firestore
      const docRef = await addDoc(collection(db, 'appointments'), {
        ...appointment,
        date: Timestamp.fromDate(appointment.date),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      console.log('Appointment created with ID:', docRef.id);
      
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
        stall: {
          ...stall,
          id: stallDoc.id
        },
        trailer: {
          ...trailer,
          id: trailerDoc.id
        }
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
                onClick={() => setActiveTab('upcoming')}
                className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-[#3e2802] text-[#3e2802]'
                    : 'border-transparent text-[#3e2802] hover:text-[#2a1c01] hover:border-[#2a1c01]'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`py-2 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'past'
                    ? 'border-[#3e2802] text-[#3e2802]'
                    : 'border-transparent text-[#3e2802] hover:text-[#2a1c01] hover:border-[#2a1c01]'
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
                  className="border border-[#3e2802] rounded-xl p-3 sm:p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 bg-[#3e2802]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start md:items-center">
                    <div className="mb-2 sm:mb-0">
                      <div className="flex items-center mb-1 sm:mb-2">
                        <h3 className="text-base sm:text-lg font-medium text-[#ffffff]">
                          {appointment.stall?.serviceType 
                            ? appointment.stall.serviceType.charAt(0).toUpperCase() + appointment.stall.serviceType.slice(1)
                            : 'Service Type Unavailable'}
                        </h3>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-[#ffffff] mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {appointment.date instanceof Date 
                          ? format(appointment.date, 'MMMM d, yyyy')
                          : 'Date Unavailable'} at {appointment.startTime}
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-[#ffffff]">
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
