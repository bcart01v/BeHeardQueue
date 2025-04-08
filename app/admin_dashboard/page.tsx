'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot, updateDoc, Timestamp, addDoc, orderBy, limit, writeBatch, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, auth, storage } from '@/lib/firebase';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { User } from '@/types/user';
import { ServiceType } from '@/types/stall';
import { Stall } from '@/types/stall';
import { Trailer } from '@/types/trailer';
import { AppointmentWithDetails } from '@/types/appointment';
import { 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  BellIcon,
  UserPlusIcon,
  UserIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/app/components/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'next/navigation';

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

interface Appointment {
  id: string;
  userId: string;
  companyId: string;
  serviceType: 'shower' | 'laundry' | 'haircut';
  date: Date;
  startTime: string;
  endTime: string;
  duration?: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  stallId: string;
  stallName?: string;
  userName?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Notification {
  id: string;
  userId: string;
  companyId: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

interface StallGridProps {
  stalls: any[];
  trailers: any[];
  appointments: Appointment[];
  startTime: string;
  endTime: string;
  selectedService: 'shower' | 'laundry';
  selectedTrailerId: string | null;
  selectedTimeSlot: {time: string, stallId: string, trailerId: string} | null;
  updateAppointmentStatus: (appointmentId: string, newStatus: 'scheduled' | 'in-progress' | 'completed' | 'cancelled') => Promise<void>;
  onTimeSlotSelect: (time: string, stallId: string, trailerId: string) => void;
}

interface NewUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto: File | null;
  photoURL: string;
}

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  companyId: string;
  onAppointmentCreated: () => void;
  selectedTimeSlot: {time: string, stallId: string, trailerId: string} | null;
  setSelectedTimeSlot: (timeSlot: {time: string, stallId: string, trailerId: string} | null) => void;
  companyStartTime: string;
  companyEndTime: string;
}

function getCurrentTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

function findClosestTimeSlot(timeSlots: string[], currentTime: string): number {
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  
  let closestIndex = 0;
  let minDifference = Number.MAX_SAFE_INTEGER;
  
  timeSlots.forEach((slot, index) => {
    const [slotHour, slotMinute] = slot.split(':').map(Number);
    const slotTotalMinutes = slotHour * 60 + slotMinute;
    const difference = Math.abs(slotTotalMinutes - currentTotalMinutes);
    
    if (difference < minDifference) {
      minDifference = difference;
      closestIndex = index;
    }
  });
  
  return closestIndex;
}

const StallGrid: React.FC<StallGridProps> = ({ 
  stalls, 
  trailers, 
  appointments, 
  startTime, 
  endTime, 
  selectedService, 
  selectedTrailerId,
  selectedTimeSlot,
  updateAppointmentStatus, 
  onTimeSlotSelect 
}) => {
  const [selectedGridAppointment, setSelectedGridAppointment] = useState<Appointment | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<string>(getCurrentTimeString());
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number>(-1);

  // Filter stalls based on service type and selected trailer
  const filteredStalls = stalls.filter(stall => 
    stall.serviceType === selectedService && 
    (selectedTrailerId === null || stall.trailerGroup === selectedTrailerId)
  );
  
  const filteredTrailers = trailers.filter(trailer => 
    filteredStalls.some(stall => stall.trailerGroup === trailer.id)
  );

  // Generate time slots and find current time index
  useEffect(() => {
    const slots = generateTimeSlots(startTime, endTime);
    setTimeSlots(slots);
    
    const currentTimeStr = getCurrentTimeString();
    setCurrentTime(currentTimeStr);
    
    const closestIndex = findClosestTimeSlot(slots, currentTimeStr);
    setCurrentTimeIndex(closestIndex);
    
    // Scroll to current time after a short delay to ensure the grid is rendered
    setTimeout(() => {
      if (timeSlotsRef.current) {
        const timeRow = timeSlotsRef.current.querySelector(`[data-time-index="${closestIndex}"]`);
        if (timeRow) {
          timeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 500);
    
    // Update current time every minute
    const interval = setInterval(() => {
      const newCurrentTime = getCurrentTimeString();
      setCurrentTime(newCurrentTime);
      const newClosestIndex = findClosestTimeSlot(slots, newCurrentTime);
      setCurrentTimeIndex(newClosestIndex);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500 text-white';
      case 'in-progress':
        return 'bg-yellow-500 text-white';
      case 'completed':
        return 'bg-green-500 text-white';
      case 'cancelled':
        return 'bg-black text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getTextColor = (status: string) => {
    return 'text-white'; // All backgrounds are dark enough for white text
  };

  const getStallStatus = (stallId: string, time: string) => {
    // First check if the stall itself has a status
    const stall = stalls.find(s => s.id === stallId);
    if (stall?.status === 'out-of-order') {
      return { status: 'out-of-order', userName: null };
    }
    if (stall?.status === 'needs-cleaning') {
      return { status: 'needs-cleaning', userName: null };
    }

    // Then check for appointments
    const appointment = appointments.find(app => {
      // Convert appointment times to 24-hour format for comparison
      const appStartTime = convertTo24Hour(app.startTime);
      const appEndTime = convertTo24Hour(app.endTime);
      
      return app.stallId === stallId && 
             appStartTime <= time && 
             appEndTime > time;
    });

    if (appointment) {
      return { 
        status: appointment.status,
        userName: appointment.userName 
      };
    }

    return { status: 'available', userName: null };
  };

  const getAppointmentForCell = (stallId: string, time: string) => {
    return appointments.find(app => {
      const appStartTime = convertTo24Hour(app.startTime);
      const appEndTime = convertTo24Hour(app.endTime);
      
      return app.stallId === stallId && 
             appStartTime <= time && 
             appEndTime > time;
    });
  };

  // Add a function to handle time slot click
  const handleTimeSlotClick = (time: string, stallId: string, trailerId: string, appointment: Appointment | undefined) => {
    if (appointment) {
      // If there's an appointment, show the appointment details
      setSelectedGridAppointment(appointment);
    } else {
      // If there's no appointment, trigger the time slot selection callback
      onTimeSlotSelect(time, stallId, trailerId);
    }
  };

  return (
    <>
      <div className="flex flex-col border border-[#ffa300] rounded-xl bg-[#1e1b1b] overflow-hidden" ref={gridRef}>
        {/* Header - Trailers and Stalls - Add padding right to account for scrollbar */}
        <div className="flex border-b border-[#ffa300] pr-[17px]">
          <div className="w-24 flex-shrink-0 bg-[#1e1b1b] text-white font-bold p-2 text-center border-r border-[#ffa300]">Time</div>
          {filteredTrailers.map(trailer => (
            <div key={trailer.id} className="flex-1">
              <div className="text-center font-bold p-2 bg-[#1e1b1b] text-white border-b border-[#ffa300]">{trailer.name}</div>
              <div className="flex">
                {filteredStalls.filter(stall => stall.trailerGroup === trailer.id)
                  .map(stall => {
                    const currentStatus = getCurrentStallStatus(stall.id, stalls, appointments);
                    const statusColor = getStatusColor(currentStatus.status);
                    
                    return (
                      <div 
                        key={stall.id} 
                        className={`flex-1 text-center p-2 border-r border-[#ffa300] bg-[#1e1b1b] text-white`}
                      >
                        <div className="font-medium">{stall.name}</div>
                        {currentStatus.userName && (
                          <div className="text-xs mt-1 text-white opacity-75">
                            {currentStatus.userName}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots and stall status - Make this scrollable with fixed height */}
        <div className="flex flex-col relative h-[500px] overflow-y-auto" ref={timeSlotsRef}>
          {timeSlots.map((time, index) => (
            <div 
              key={time} 
              className="flex border-b border-[#ffa300] relative"
              data-time-index={index}
            >
              <div className="w-24 flex-shrink-0 p-2 text-sm font-medium text-white bg-[#1e1b1b] border-r border-[#ffa300] sticky left-0 z-10">
                {formatTimeForDisplay(time)}
              </div>
              {filteredTrailers.map(trailer => (
                <div key={`${trailer.id}-${time}`} className="flex-1 flex">
                  {filteredStalls.filter(stall => stall.trailerGroup === trailer.id)
                    .map(stall => {
                      const stallStatus = getStallStatus(stall.id, time);
                      const appointment = getAppointmentForCell(stall.id, time);
                      const showColor = appointment !== undefined;
                      
                      return (
                        <div 
                          key={`${stall.id}-${time}`} 
                          className={`flex-1 h-12 border-r border-[#ffa300] ${
                            selectedTimeSlot && 
                            selectedTimeSlot.time === time && 
                            selectedTimeSlot.stallId === stall.id
                              ? 'ring-2 ring-[#ffa300] ring-offset-2 ring-offset-[#1e1b1b]'
                              : ''
                          } ${showColor ? getStatusColor(stallStatus.status) : 'bg-[#1e1b1b]'} relative group cursor-pointer`}
                          onClick={() => handleTimeSlotClick(time, stall.id, trailer.id, appointment)}
                        >
                          {stallStatus.userName && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium px-1 truncate">
                              {stallStatus.userName}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          ))}
          
          {/* Current time indicator line */}
          {currentTimeIndex >= 0 && (
            <div 
              className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ 
                top: `${currentTimeIndex * 48}px`, // 48px is the height of each time slot row
                transform: 'translateY(-50%)'
              }}
            >
              <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="absolute -right-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Popup Modal */}
      {selectedGridAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#3e2802] text-[#ffa300] p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Appointment Details</h3>
              <button 
                onClick={() => setSelectedGridAppointment(null)}
                className="text-[#ffa300] hover:text-white"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-300">Customer</p>
                <p className="font-medium capitalize">{selectedGridAppointment.userName || 'Unknown User'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-300">Service Type</p>
                <p className="font-medium capitalize">{selectedGridAppointment.serviceType}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-300">Time</p>
                <p className="font-medium">{selectedGridAppointment.startTime} - {selectedGridAppointment.endTime}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-300">Duration</p>
                <p className="font-medium">{selectedGridAppointment.duration ? `${selectedGridAppointment.duration} minutes` : 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-300">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  selectedGridAppointment.status === 'scheduled' ? 'bg-blue-500 text-white' :
                  selectedGridAppointment.status === 'in-progress' ? 'bg-yellow-500 text-white' :
                  selectedGridAppointment.status === 'completed' ? 'bg-green-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {selectedGridAppointment.status}
                </span>
              </div>
              
              <div>
                <p className="text-sm text-gray-300">Stall</p>
                <p className="font-medium">{selectedGridAppointment.stallName || `Stall ${selectedGridAppointment.stallId.substring(0, 4)}`}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-300">Created At</p>
                <p className="font-medium">{selectedGridAppointment.createdAt.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-2">
              {selectedGridAppointment.status === 'scheduled' && (
                <button 
                  onClick={() => {
                    updateAppointmentStatus(selectedGridAppointment.id, 'in-progress');
                    setSelectedGridAppointment(null);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Start Service
                </button>
              )}
              {selectedGridAppointment.status === 'in-progress' && (
                <button 
                  onClick={() => {
                    updateAppointmentStatus(selectedGridAppointment.id, 'completed');
                    setSelectedGridAppointment(null);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Complete Service
                </button>
              )}
              {(selectedGridAppointment.status === 'scheduled' || selectedGridAppointment.status === 'in-progress') && (
                <button 
                  onClick={() => {
                    updateAppointmentStatus(selectedGridAppointment.id, 'cancelled');
                    setSelectedGridAppointment(null);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Cancel Service
                </button>
              )}
              <button 
                onClick={() => setSelectedGridAppointment(null)}
                className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded hover:bg-[#2a2525]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let currentDate = new Date();
  currentDate.setHours(startHour, startMinute, 0);
  
  const endDate = new Date();
  endDate.setHours(endHour, endMinute, 0);
  
  // If end time is earlier than start time, it means it's overnight (e.g., 8:00 AM to 11:45 PM)
  if (endDate < currentDate) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  while (currentDate < endDate) {
    // Format time in 24-hour format for internal use
    const time24 = currentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // Format time in 12-hour format with AM/PM for display
    const time12 = currentDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Store both formats
    slots.push(time24);
    
    currentDate.setMinutes(currentDate.getMinutes() + 30);
  }
  
  return slots;
}

// Create User Selection Modal Component
function UserSelectionModal({
  isOpen,
  onClose,
  onExistingUser,
  onNewUser
}: {
  isOpen: boolean;
  onClose: () => void;
  onExistingUser: () => void;
  onNewUser: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e1b1b] rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#ffa300]">Create Appointment</h2>
          <button onClick={onClose} className="text-[#ffa300] hover:text-[#ffb733]">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={onExistingUser}
            className="w-full bg-[#3e2802] text-[#ffa300] p-4 rounded-lg hover:bg-[#2a1c01] transition-colors flex items-center justify-center space-x-2"
          >
            <UserIcon className="h-6 w-6" />
            <span>Existing User</span>
          </button>

          <button
            onClick={onNewUser}
            className="w-full bg-[#3e2802] text-[#ffa300] p-4 rounded-lg hover:bg-[#2a1c01] transition-colors flex items-center justify-center space-x-2"
          >
            <UserPlusIcon className="h-6 w-6" />
            <span>New User</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Existing User Search Modal Component
function ExistingUserSearchModal({
  isOpen,
  onClose,
  onUserSelect,
  companyId
}: {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (user: User) => void;
  companyId: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        console.log('Searching for users with term:', searchTerm);
        console.log('Company ID:', companyId);
        
        // First get all users for the company
        const usersQuery = query(
          collection(db, 'users'),
          where('companyId', '==', companyId)
        );
        
        const snapshot = await getDocs(usersQuery);
        console.log('Total users found:', snapshot.size);
        
        // Then filter them client-side for more flexible matching
        const usersData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            console.log('User data:', data);
            return { id: doc.id, ...data } as User;
          })
          .filter(user => {
            const searchLower = searchTerm.toLowerCase();
            const firstName = (user.firstName || '').toLowerCase();
            const lastName = (user.lastName || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`;
            
            return firstName.includes(searchLower) ||
                   lastName.includes(searchLower) ||
                   email.includes(searchLower) ||
                   fullName.includes(searchLower);
          });

        console.log('Filtered users:', usersData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, companyId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e1b1b] rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#ffa300]">Search Users</h2>
          <button onClick={onClose} className="text-[#ffa300] hover:text-[#ffb733]">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pr-10 border border-[#3e2802] rounded-md bg-[#ffffff] text-[#3e2802]"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-[#3e2802]" />
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#ffa300] mx-auto"></div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className="w-full text-left p-3 hover:bg-[#3e2802] rounded-lg mb-2 transition-colors"
              >
                <div className="flex items-center">
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt={user.firstName} className="w-10 h-10 rounded-full mr-3" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#3e2802] flex items-center justify-center mr-3">
                      <span className="text-[#ffa300] text-lg">
                        {user.firstName[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="text-[#ffa300] font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-[#ffa300] text-sm opacity-75">
                      {user.email}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {users.length === 0 && searchTerm && (
              <div className="text-center text-[#ffa300] py-4">
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// New User Form Modal Component
function NewUserFormModal({
  isOpen,
  onClose,
  onUserCreate,
  companyId
}: {
  isOpen: boolean;
  onClose: () => void;
  onUserCreate: (user: User) => void;
  companyId: string;
}) {
  const [form, setForm] = useState<NewUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profilePhoto: null,
    photoURL: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm(prev => ({ ...prev, profilePhoto: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let photoURL = '';
      if (form.profilePhoto) {
        const storageRef = ref(storage, `profile_photos/${Date.now()}_${form.profilePhoto.name}`);
        const uploadResult = await uploadBytes(storageRef, form.profilePhoto);
        photoURL = await getDownloadURL(uploadResult.ref);
      }

      const now = Timestamp.now();

      // Create user in Firebase
      const userData = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        profilePhoto: photoURL,
        role: 'user',
        companyId,
        createdAt: now,
        updatedAt: now
      };

      const userRef = await addDoc(collection(db, 'users'), userData);

      // Create user in Bubble
      const bubbleResponse = await fetch('/api/create-bubble-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          id: userRef.id
        }),
      });

      if (!bubbleResponse.ok) {
        throw new Error('Failed to create user in Bubble');
      }

      const newUser = {
        id: userRef.id,
        ...userData,
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      } as User;

      onUserCreate(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      setError('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e1b1b] rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#ffa300]">Create New User</h2>
          <button onClick={onClose} className="text-[#ffa300] hover:text-[#ffb733]">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 text-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              Profile Photo
            </label>
            <div className="flex items-center space-x-4">
              {form.profilePhoto ? (
                <img
                  src={URL.createObjectURL(form.profilePhoto)}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#3e2802] flex items-center justify-center">
                  <PhotoIcon className="h-8 w-8 text-[#ffa300]" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] cursor-pointer"
              >
                Choose Photo
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              First Name *
            </label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full p-2 border border-[#3e2802] rounded-md bg-[#ffffff] text-[#3e2802]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full p-2 border border-[#3e2802] rounded-md bg-[#ffffff] text-[#3e2802]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-2 border border-[#3e2802] rounded-md bg-[#ffffff] text-[#3e2802]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ffa300] mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full p-2 border border-[#3e2802] rounded-md bg-[#ffffff] text-[#3e2802]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#ffa300] text-[#ffa300] rounded-md hover:bg-[#ffa300] hover:text-[#1e1b1b]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#ffa300] text-[#1e1b1b] rounded-md hover:bg-[#ffb733] disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add this helper function at the top level
function generateAvailableTimeSlots(startTime: string, endTime: string, existingAppointments: Appointment[], duration: number = 30): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let currentDate = new Date();
  currentDate.setHours(startHour, startMinute, 0);
  
  const endDate = new Date();
  endDate.setHours(endHour, endMinute, 0);
  
  // If current time is after start time, use current time as start
  const now = new Date();
  if (now > currentDate) {
    currentDate = now;
    // Round to next 30-minute interval
    const minutes = currentDate.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    currentDate.setMinutes(roundedMinutes);
    currentDate.setSeconds(0);
    currentDate.setMilliseconds(0);
  }
  
  while (currentDate < endDate) {
    const timeString = currentDate.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
    
    // Check if this time slot conflicts with any existing appointments
    const isAvailable = !existingAppointments.some(app => {
      const appStart = new Date();
      const [appHour, appMinute] = app.startTime.split(':').map(Number);
      appStart.setHours(appHour, appMinute, 0);
      
      const appEnd = new Date(appStart);
      appEnd.setMinutes(appStart.getMinutes() + (app.duration || 30));
      
      const slotEnd = new Date(currentDate);
      slotEnd.setMinutes(currentDate.getMinutes() + duration);
      
      return (currentDate < appEnd && slotEnd > appStart);
    });
    
    if (isAvailable) {
      slots.push(timeString);
    }
    
    currentDate.setMinutes(currentDate.getMinutes() + 30);
  }
  
  return slots;
}

// Update the getCurrentStallStatus function to accept stalls and appointments as parameters
const getCurrentStallStatus = (
  stallId: string, 
  stalls: any[], 
  appointments: Appointment[]
) => {
  // First check stall's own status
  const stall = stalls.find((s: any) => s.id === stallId);
  if (stall?.status === 'out-of-order') {
    return { status: 'out-of-order', userName: null };
  }
  if (stall?.status === 'needs-cleaning') {
    return { status: 'needs-cleaning', userName: null };
  }

  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  // Then check for current appointments
  const appointment = appointments.find((app: Appointment) => {
    return app.stallId === stallId && 
           app.startTime <= currentTime && 
           app.endTime > currentTime;
  });

  if (appointment) {
    return { 
      status: appointment.status === 'in-progress' ? 'in-use' : 'available',
      userName: appointment.userName 
    };
  }

  return { status: 'available', userName: null };
};

// Update the AppointmentBookingModal component to fix the stalls reference
function AppointmentBookingModal({
  isOpen,
  onClose,
  user,
  companyId,
  onAppointmentCreated,
  selectedTimeSlot,
  setSelectedTimeSlot,
  companyStartTime,
  companyEndTime
}: AppointmentBookingModalProps) {
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stallData, setStallData] = useState<any>(null);

  // Set the selected service based on the stall's service type
  useEffect(() => {
    if (selectedTimeSlot) {
      // Fetch the stall data
      const fetchData = async () => {
        try {
          // Fetch stall data
          const stallDoc = await getDoc(doc(db, 'stalls', selectedTimeSlot.stallId));
          if (stallDoc.exists()) {
            const data = stallDoc.data();
            setStallData(data);
            setSelectedService(data.serviceType as ServiceType);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      
      fetchData();
    }
  }, [selectedTimeSlot]);

  const handleCreateAppointment = async () => {
    if (!selectedTimeSlot || !stallData || !selectedService) {
      setError('Please select a service type');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // The time is already in 24-hour format, so we don't need to convert it
      const timeString = selectedTimeSlot.time;

      // Calculate end time
      const [hoursStr, minutesStr] = timeString.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      const endDate = new Date();
      endDate.setHours(hours);
      endDate.setMinutes(minutes);
      endDate.setMinutes(endDate.getMinutes() + (stallData.duration || 30));
      const endTimeString = endDate.toLocaleTimeString('en-US', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // Check if there's already an appointment for this stall at this time
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('companyId', '==', companyId),
        where('date', '==', Timestamp.fromDate(today)),
        where('stallId', '==', selectedTimeSlot.stallId)
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const existingAppointments = appointmentsSnapshot.docs.map(doc => doc.data());
      
      // Check for time conflicts
      const hasConflict = existingAppointments.some(app => {
        return (
          (timeString >= app.startTime && timeString < app.endTime) ||
          (endTimeString > app.startTime && endTimeString <= app.endTime)
        );
      });
      
      if (hasConflict) {
        setError('This time slot is already booked for this stall');
        setLoading(false);
        return;
      }

      const now = new Date();
      const appointment = {
        userId: user.id,
        companyId,
        stallId: selectedTimeSlot.stallId,
        trailerId: selectedTimeSlot.trailerId,
        serviceType: selectedService,
        date: Timestamp.fromDate(now),
        startTime: timeString,
        endTime: endTimeString,
        duration: stallData.duration || 30,
        status: 'scheduled',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'appointments'), appointment);
      onAppointmentCreated();
      onClose();
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError('Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e1b1b] rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#ffa300]">Book Appointment for {user.firstName}</h2>
          <button onClick={onClose} className="text-[#ffa300] hover:text-[#ffb733]">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 text-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {selectedTimeSlot && (
            <div className="bg-[#3e2802] p-4 rounded-lg">
              <h3 className="text-[#ffa300] font-medium mb-2">Selected Time Slot</h3>
              <p className="text-white">Time: {selectedTimeSlot.time}</p>
              {stallData && (
                <p className="text-white capitalize mt-1">Service: {stallData.serviceType}</p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#ffa300] text-[#ffa300] rounded-md hover:bg-[#ffa300] hover:text-[#1e1b1b]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateAppointment}
              disabled={loading || !selectedTimeSlot || !selectedService}
              className="px-4 py-2 bg-[#ffa300] text-[#1e1b1b] rounded-md hover:bg-[#ffb733] disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add a helper function to format time for display
function formatTimeForDisplay(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Add a helper function to convert 12-hour time to 24-hour time
function convertTo24Hour(time12: string): string {
  // If already in 24-hour format, return as is
  if (time12.includes(':')) {
    const parts = time12.split(':');
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      return time12;
    }
  }
  
  // Parse 12-hour format (e.g., "11:45 AM")
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let hours24 = hours;
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours24 += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours24 = 0;
  }
  
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Add this new component before the AdminDashboardPage component
interface StallStatusCardProps {
  stall: any;
  onStatusChange: (stallId: string, newStatus: string) => void;
}

const StallStatusCard: React.FC<StallStatusCardProps> = ({ stall, onStatusChange }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-use':
        return 'bg-yellow-500';
      case 'needs-cleaning':
        return 'bg-orange-500';
      case 'out-of-order':
        return 'bg-red-500';
      default:
        return 'bg-green-500';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'in-use':
        return 'In Use';
      case 'needs-cleaning':
        return 'Needs Cleaning';
      case 'out-of-order':
        return 'Out of Order';
      default:
        return 'Available';
    }
  };

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'in-use', label: 'In Use' },
    { value: 'needs-cleaning', label: 'Needs Cleaning' },
    { value: 'out-of-order', label: 'Out of Order' }
  ];

  return (
    <>
      <div 
        className={`${getStatusColor(stall.status)} rounded-lg p-4 cursor-pointer relative transition-all hover:shadow-lg`}
        onClick={() => setShowStatusMenu(true)}
      >
        <h3 className="text-white font-bold text-lg">{stall.name}</h3>
        <p className="text-white mt-1">{formatStatus(stall.status || 'available')}</p>
      </div>

      {/* Status Selection Modal */}
      {showStatusMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1e1b1b] rounded-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#ffa300]">Update Status: {stall.name}</h3>
              <button 
                onClick={() => setShowStatusMenu(false)}
                className="text-[#ffa300] hover:text-[#ffb733]"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-2">
              {statusOptions.map(({ value, label }) => (
                <button
                  key={value}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    value === stall.status
                      ? 'bg-[#ffa300] text-[#1e1b1b]'
                      : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1f02]'
                  }`}
                  onClick={() => {
                    onStatusChange(stall.id, value);
                    setShowStatusMenu(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface StallStatusSectionProps {
  stalls: any[];
  trailers: any[];
  onStatusChange: (stallId: string, newStatus: string) => void;
}

const StallStatusSection: React.FC<StallStatusSectionProps> = ({ stalls, trailers, onStatusChange }) => {
  const [selectedService, setSelectedService] = useState<'shower' | 'laundry'>('shower');
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);

  const filteredStalls = stalls.filter(stall => 
    stall.serviceType === selectedService && 
    (selectedTrailerId === null || stall.trailerGroup === selectedTrailerId)
  );

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-[#ffa300] mb-4">Stall Status</h2>
      
      {/* Service Type Toggle */}
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => {
            setSelectedService('shower');
            setSelectedTrailerId(null);
          }}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            selectedService === 'shower'
              ? 'bg-[#ffa300] text-[#1e1b1b]'
              : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1f02]'
          }`}
        >
          Showers
        </button>
        <button
          onClick={() => {
            setSelectedService('laundry');
            setSelectedTrailerId(null);
          }}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            selectedService === 'laundry'
              ? 'bg-[#ffa300] text-[#1e1b1b]'
              : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
          }`}
        >
          Laundry
        </button>
      </div>

      {/* Trailer Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedTrailerId(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTrailerId === null
              ? 'bg-[#ffa300] text-[#1e1b1b]'
              : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1f02]'
          }`}
        >
          All Trailers
        </button>
        
        {trailers
          .filter(trailer => 
            stalls.some(stall => 
              stall.trailerGroup === trailer.id && 
              stall.serviceType === selectedService
            )
          )
          .map(trailer => (
            <button
              key={trailer.id}
              onClick={() => setSelectedTrailerId(trailer.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTrailerId === trailer.id
                  ? 'bg-[#ffa300] text-[#1e1b1b]'
                  : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1f02]'
              }`}
            >
              {trailer.name}
            </button>
          ))
        }
      </div>

      {/* Stall Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredStalls.map(stall => (
          <StallStatusCard
            key={stall.id}
            stall={stall}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
};

// Add function to check if appointment should be moved to history
const shouldMoveToHistory = (appointment: AppointmentWithDetails): boolean => {
  const now = new Date();
  const appointmentDate = new Date(appointment.date);
  appointmentDate.setHours(23, 59, 59, 999); // End of appointment day
  
  return (
    // Past appointments
    appointmentDate < now ||
    // Completed or cancelled appointments
    appointment.status === 'completed' ||
    appointment.status === 'cancelled' ||
    // Missed appointments (past scheduled appointments)
    (appointment.status === 'scheduled' && appointmentDate < now)
  );
};

// Add function to move appointments to history
const moveAppointmentsToHistory = async (appointments: AppointmentWithDetails[]) => {
  const batch = writeBatch(db);
  
  for (const appointment of appointments) {
    // Determine the reason for moving to history
    let reason = appointment.status === 'completed' ? 'completed' :
                 appointment.status === 'cancelled' ? 'cancelled' :
                 appointment.status === 'scheduled' ? 'missed' :
                 'past_date';

    // Create new doc in history collection
    const historyRef = doc(collection(db, 'appointment_history'));
    
    // Convert dates to Firestore Timestamps
    const historicalData = {
      ...appointment,
      originalId: appointment.id,
      status: appointment.status === 'scheduled' ? 'missed' : appointment.status,
      movedToHistoryAt: Timestamp.now(),
      reason,
      // Convert Date objects to Timestamps
      date: Timestamp.fromDate(new Date(appointment.date)),
      createdAt: Timestamp.fromDate(new Date(appointment.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(appointment.updatedAt))
    };
    
    // Remove the id from the data (it will be the document id)
    const { id, ...dataWithoutId } = historicalData;
    
    batch.set(historyRef, dataWithoutId);
    
    // Delete from current appointments
    const appointmentRef = doc(db, 'appointments', appointment.id);
    batch.delete(appointmentRef);
    
    console.log('Moving appointment to history:', {
      appointmentId: appointment.id,
      newHistoryId: historyRef.id,
      reason,
      status: historicalData.status
    });
  }
  
  try {
    await batch.commit();
    console.log(`Successfully moved ${appointments.length} appointments to history`);
  } catch (error) {
    console.error('Error moving appointments to history:', error);
    throw new Error('Failed to move appointments to history');
  }
};

// Function to check and move past appointments to history
const checkPastAppointments = async () => {
  try {
    // Get all scheduled appointments
    const scheduledQuery = query(
      collection(db, 'appointments'),
      where('status', '==', 'scheduled')
    );
    
    const scheduledSnapshot = await getDocs(scheduledQuery);
    const now = new Date();
    
    // Filter for past appointments
    const pastAppointments = await Promise.all(
      scheduledSnapshot.docs.map(async docSnapshot => {
        const data = docSnapshot.data();
        const appointmentDate = data.date.toDate();
        const endTime = data.endTime;
        
        // Parse end time
        const [hours, minutes] = endTime.split(':')[0].split(' ')[0].split(':').map(Number);
        const period = endTime.split(' ')[1];
        const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : hours;
        
        // Set appointment end time
        appointmentDate.setHours(adjustedHours, minutes);
        
        // If appointment is in the past
        if (appointmentDate < now) {
          // Get related data
          const [userDoc, stallDoc, trailerDoc] = await Promise.all([
            getDoc(doc(db, 'users', data.userId)),
            getDoc(doc(db, 'stalls', data.stallId)),
            getDoc(doc(db, 'trailers', data.trailerId))
          ]);
          
          return {
            id: docSnapshot.id,
            ...data,
            date: appointmentDate,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            user: userDoc.data() as User,
            stall: stallDoc.data() as Stall,
            trailer: trailerDoc.data() as Trailer
          } as AppointmentWithDetails;
        }
        return null;
      })
    );
    
    // Filter out null values and move to history
    const appointmentsToMove = pastAppointments.filter((app): app is AppointmentWithDetails => app !== null);
    if (appointmentsToMove.length > 0) {
      await moveAppointmentsToHistory(appointmentsToMove);
      // Refresh the appointments list
      fetchAppointments();
    }
  } catch (error) {
    console.error('Error checking past appointments:', error);
    toast.error('Failed to process past appointments');
  }
};

// Add button to manually trigger check
const AdminControls = () => {
  const [isChecking, setIsChecking] = useState(false);
  
  const handleCheckPastAppointments = async () => {
    setIsChecking(true);
    try {
      await checkPastAppointments();
      toast.success('Successfully processed past appointments');
    } catch (error) {
      toast.error('Failed to process past appointments');
    } finally {
      setIsChecking(false);
    }
  };
  
  return (
    <div className="mb-6 p-4 bg-[#3e2802] rounded-lg">
      <h2 className="text-lg font-semibold text-[#ffa300] mb-4">Admin Controls</h2>
      <button
        onClick={handleCheckPastAppointments}
        disabled={isChecking}
        className="px-4 py-2 bg-[#ffa300] text-[#3e2802] rounded-lg hover:bg-[#ffb733] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isChecking ? 'Processing...' : 'Process Past Appointments'}
      </button>
    </div>
  );
};

const fetchAppointments = async () => {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(appointmentsRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const appointments: AppointmentWithDetails[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const appointmentData = docSnapshot.data();
      const appointment: AppointmentWithDetails = {
        id: docSnapshot.id,
        ...appointmentData,
        date: appointmentData.date.toDate(),
        createdAt: appointmentData.createdAt.toDate(),
        updatedAt: appointmentData.updatedAt.toDate(),
      } as AppointmentWithDetails;
      
      // Fetch related user details
      if (appointmentData.userId) {
        const userRef = doc(db, 'users', appointmentData.userId);
        const userSnapshot = await getDoc(userRef);
        if (userSnapshot.exists()) {
          appointment.user = userSnapshot.data() as User;
        }
      }
      
      // Fetch related stall details
      if (appointmentData.stallId) {
        const stallRef = doc(db, 'stalls', appointmentData.stallId);
        const stallSnapshot = await getDoc(stallRef);
        if (stallSnapshot.exists()) {
          appointment.stall = stallSnapshot.data() as Stall;
        }
      }
      
      // Fetch related trailer details
      if (appointmentData.trailerId) {
        const trailerRef = doc(db, 'trailers', appointmentData.trailerId);
        const trailerSnapshot = await getDoc(trailerRef);
        if (trailerSnapshot.exists()) {
          appointment.trailer = trailerSnapshot.data() as Trailer;
        }
      }
      
      appointments.push(appointment);
    }
    
    return appointments;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    toast.error('Failed to fetch appointments');
    return [];
  }
};

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { user: authUser, loading: authLoading } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [companyStartTime, setCompanyStartTime] = useState('08:00');
  const [companyEndTime, setCompanyEndTime] = useState('20:00');
  const [selectedService, setSelectedService] = useState<'shower' | 'laundry'>('shower');
  const [showUserSelectionModal, setShowUserSelectionModal] = useState(false);
  const [showExistingUserModal, setShowExistingUserModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{time: string, stallId: string, trailerId: string} | null>(null);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
  const [showError, setShowError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const searchParams = useSearchParams();
  
  // Get appointment ID and date from URL parameters
  const appointmentId = searchParams.get('appointmentId');
  const dateParam = searchParams.get('date');
  
  // Set the selected date from URL parameter if available
  useEffect(() => {
    if (dateParam) {
      try {
        const parsedDate = parseISO(dateParam);
        setSelectedDate(parsedDate);
        console.log('Setting date from URL parameter:', parsedDate);
      } catch (error) {
        console.error('Error parsing date from URL:', error);
      }
    }
  }, [dateParam]);
  
  // Set the selected appointment from URL parameter if available
  useEffect(() => {
    if (appointmentId && todayAppointments.length > 0) {
      const appointment = todayAppointments.find(a => a.id === appointmentId);
      if (appointment) {
        setSelectedAppointment(appointment);
        setShowAppointmentDetails(true);
        console.log('Setting appointment from URL parameter:', appointment);
      }
    }
  }, [appointmentId, todayAppointments]);
  
  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (authLoading) {
          console.log('Auth is still loading...');
          return;
        }
        
        if (authUser) {
          console.log('Auth user loaded:', authUser);
          console.log('Auth user companyId:', authUser.companyId);
          
          // Create a compatible user object
          const compatibleUser: User = {
            id: authUser.id,
            email: authUser.email,
            firstName: authUser.firstName,
            lastName: authUser.lastName,
            role: authUser.role === 'software-owner' ? 'admin' : authUser.role,
            companyId: authUser.companyId,
            profilePhoto: authUser.profilePhoto,
            createdAt: authUser.createdAt,
            updatedAt: authUser.updatedAt,
            displayName: authUser.displayName
          };
          
          console.log('Compatible user created:', compatibleUser);
          console.log('Compatible user companyId:', compatibleUser.companyId);
          
          setCurrentUser(compatibleUser);
          
          // Get current company data
          if (authUser.companyId) {
            console.log('Fetching company data for ID:', authUser.companyId);
            const companyDoc = await getDoc(doc(db, 'companies', authUser.companyId));
            if (companyDoc.exists()) {
              setCurrentCompany(companyDoc.data() as Company);
            } else {
              console.error('Company document not found for ID:', authUser.companyId);
            }
          } else {
            console.error('User has no company ID:', authUser);
          }
        } else {
          console.error('No authenticated user found');
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
    
    // Cleanup function
    return () => {
      // Cleanup will be handled by the individual listener cleanup functions
    };
  }, [authUser, authLoading]);

  // Separate useEffect for fetching appointments after currentUser is set
  useEffect(() => {
    if (currentUser) {
      console.log('Current user is set, fetching appointments for:', currentUser.companyId);
      fetchAppointmentsForDate(selectedDate);
    }
  }, [currentUser, selectedDate]);
  
  // Separate useEffect for setting up real-time listeners
  useEffect(() => {
    if (currentUser) {
      console.log('Setting up real-time listeners for date:', selectedDate.toISOString());
      setupRealtimeListeners();
    }
  }, [currentUser, selectedDate]);
  
  // Function to fetch appointments for a specific date
  const fetchAppointmentsForDate = async (date: Date) => {
    try {
      if (!currentUser?.companyId) {
        console.error('No company ID available');
        return [];
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('Fetching appointments for date:', date.toISOString());

      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('companyId', '==', currentUser.companyId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
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

      // Sort appointments by time
      appointments.sort((a, b) => {
        // Convert time strings to Date objects for proper comparison
        const [hoursA, minutesA] = a.startTime.split(':').map(Number);
        const [hoursB, minutesB] = b.startTime.split(':').map(Number);
        
        const timeA = new Date(date);
        timeA.setHours(hoursA, minutesA, 0, 0);
        
        const timeB = new Date(date);
        timeB.setHours(hoursB, minutesB, 0, 0);
        
        // Compare the Date objects
        return timeA.getTime() - timeB.getTime();
      });

      console.log(`Found ${appointments.length} appointments for date ${date.toISOString()}`);
      setTodayAppointments(appointments);
      
      // If there's a selected appointment, update it with the latest data
      if (selectedAppointment) {
        const updatedAppointment = appointments.find(a => a.id === selectedAppointment.id);
        if (updatedAppointment) {
          setSelectedAppointment(updatedAppointment);
        }
      }
      
      return appointments;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  };

  // Function to fetch today's appointments
  const fetchTodayAppointments = async () => {
    await fetchAppointmentsForDate(new Date());
  };
  
  // Function to change the selected date
  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };
  
  // Function to navigate to previous day
  const handlePrevDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };
  
  // Function to navigate to next day
  const handleNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };
  
  // Function to navigate to today
  const handleToday = () => {
    setSelectedDate(new Date());
  };
  
  const setupRealtimeListeners = () => {
    if (!currentUser?.companyId) return;
    
    // Get the selected date (start and end)
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('Setting up real-time listeners for date range:', {
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });
    
    // Set up real-time listener for appointments
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('companyId', '==', currentUser.companyId),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('startTime', 'asc')
    );
    
    const unsubscribeAppointments = onSnapshot(appointmentsQuery, async (snapshot) => {
      console.log('Real-time update received. Number of appointments:', snapshot.size);
      
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
      
      const appointments: Appointment[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('Processing appointment:', data);
        
        const stallName = stallsMap.get(data.stallId) || `Stall ${data.stallId.substring(0, 4)}`;
        const userName = usersMap.get(data.userId) || `User ${data.userId.substring(0, 4)}`;
        
        appointments.push({
          id: doc.id,
          userId: data.userId,
          companyId: data.companyId,
          serviceType: data.serviceType,
          date: data.date.toDate(),
          startTime: data.startTime,
          endTime: data.endTime,
          status: data.status,
          stallId: data.stallId,
          stallName: stallName,
          userName: userName,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        });
      });
      
      // Sort appointments by time
      appointments.sort((a, b) => {
        // Convert time strings to Date objects for proper comparison
        const [hoursA, minutesA] = a.startTime.split(':').map(Number);
        const [hoursB, minutesB] = b.startTime.split(':').map(Number);
        
        const timeA = new Date(selectedDate);
        timeA.setHours(hoursA, minutesA, 0, 0);
        
        const timeB = new Date(selectedDate);
        timeB.setHours(hoursB, minutesB, 0, 0);
        
        // Compare the Date objects
        return timeA.getTime() - timeB.getTime();
      });
      
      setTodayAppointments(appointments);
      
      // If there's a selected appointment, update it with the latest data
      if (selectedAppointment) {
        const updatedAppointment = appointments.find(a => a.id === selectedAppointment.id);
        if (updatedAppointment) {
          setSelectedAppointment(updatedAppointment);
        }
      }
    });
    
    // Set up real-time listener for notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('companyId', '==', currentUser.companyId),
      where('read', '==', false)
    );
    
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const newNotifications: Notification[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        newNotifications.push({
          id: doc.id,
          userId: data.userId,
          companyId: data.companyId,
          message: data.message,
          type: data.type,
          read: data.read,
          createdAt: data.createdAt.toDate()
        });
      });
      
      setNotifications(newNotifications);
      setUnreadNotifications(newNotifications.length);
    });
    
    // Return cleanup function
    return () => {
      unsubscribeAppointments();
      unsubscribeNotifications();
    };
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: 'scheduled' | 'in-progress' | 'completed' | 'cancelled') => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Create a notification for the user
      const appointment = todayAppointments.find(a => a.id === appointmentId);
      if (appointment) {
        await createNotification(
          appointment.userId,
          `Your ${appointment.serviceType} appointment has been ${newStatus}.`,
          newStatus === 'completed' ? 'success' : 
          newStatus === 'cancelled' ? 'error' : 
          newStatus === 'in-progress' ? 'info' : 'info'
        );
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const createNotification = async (userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    try {
      if (!currentUser?.companyId) return;
      
      await addDoc(collection(db, 'notifications'), {
        userId,
        companyId: currentUser.companyId,
        message,
        type,
        read: false,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const viewAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const closeAppointmentDetails = () => {
    setShowAppointmentDetails(false);
    setSelectedAppointment(null);
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!currentUser?.companyId) return;

      // Fetch company data
      const companyDoc = await getDoc(doc(db, 'companies', currentUser.companyId));
      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        setCompanyStartTime(companyData.startTime || '08:00');
        setCompanyEndTime(companyData.endTime || '20:00');
      }

      // Fetch trailers
      const trailersQuery = query(
        collection(db, 'trailers'),
        where('companyId', '==', currentUser.companyId)
      );
      const trailersSnapshot = await getDocs(trailersQuery);
      const trailersData = trailersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrailers(trailersData);

      // Fetch stalls
      const stallsQuery = query(
        collection(db, 'stalls'),
        where('companyId', '==', currentUser.companyId)
      );
      const stallsSnapshot = await getDocs(stallsQuery);
      const stallsData = stallsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStalls(stallsData);
    };

    fetchCompanyData();
  }, [currentUser]);

  const handleExistingUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowExistingUserModal(false);
    setShowAppointmentModal(true);
  };

  const handleNewUserCreate = (user: User) => {
    setSelectedUser(user);
    setShowNewUserModal(false);
    setShowAppointmentModal(true);
  };

  const handleAppointmentCreated = () => {
    setShowAppointmentModal(false);
    setSelectedUser(null);
    // Refresh appointments list
    fetchTodayAppointments();
  };

  // Add a function to handle time slot selection
  const handleTimeSlotSelect = (time: string, stallId: string, trailerId: string) => {
    setSelectedTimeSlot({ time, stallId, trailerId });
    setShowUserSelectionModal(true);
  };

  const handleCreateAppointmentClick = () => {
    if (!selectedTimeSlot) {
      setShowError('Please select a time slot first');
      return;
    }
    setShowUserSelectionModal(true);
  };

  const handleExistingUserSelectClick = () => {
    setShowUserSelectionModal(false);
    setShowExistingUserModal(true);
  };

  const handleNewUserSelect = () => {
    setShowUserSelectionModal(false);
    setShowNewUserModal(true);
  };

  const handleUserSelect = (user: User) => {
    setShowExistingUserModal(false);
    setSelectedUser(user);
    setShowAppointmentModal(true);
  };

  const handleStallStatusChange = async (stallId: string, newStatus: string) => {
    try {
      const stallRef = doc(db, 'stalls', stallId);
      await updateDoc(stallRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update local state
      setStalls(prevStalls => 
        prevStalls.map(stall => 
          stall.id === stallId ? { ...stall, status: newStatus } : stall
        )
      );
    } catch (error) {
      console.error('Error updating stall status:', error);
    }
  };

  // Add automatic check for past appointments
  useEffect(() => {
    // Run check immediately
    checkPastAppointments();
    
    // Set up interval to check every hour
    const interval = setInterval(checkPastAppointments, 60 * 60 * 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1b1b]">
        <div className="text-xl text-[#ffa300]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1b1b] pt-24">
      <UserSelectionModal
        isOpen={showUserSelectionModal}
        onClose={() => setShowUserSelectionModal(false)}
        onExistingUser={handleExistingUserSelectClick}
        onNewUser={handleNewUserSelect}
      />

      <ExistingUserSearchModal
        isOpen={showExistingUserModal}
        onClose={() => setShowExistingUserModal(false)}
        onUserSelect={handleExistingUserSelect}
        companyId={currentUser?.companyId || ''}
      />

      <NewUserFormModal
        isOpen={showNewUserModal}
        onClose={() => setShowNewUserModal(false)}
        onUserCreate={handleNewUserCreate}
        companyId={currentUser?.companyId || ''}
      />

      {selectedUser && (
        <AppointmentBookingModal
          isOpen={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false);
            setSelectedUser(null);
            setSelectedTimeSlot(null);
          }}
          user={selectedUser}
          companyId={currentUser?.companyId || ''}
          onAppointmentCreated={handleAppointmentCreated}
          selectedTimeSlot={selectedTimeSlot}
          setSelectedTimeSlot={setSelectedTimeSlot}
          companyStartTime={companyStartTime}
          companyEndTime={companyEndTime}
        />
      )}

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#ffa300]">Admin Dashboard</h1>
          
          {/* Date Navigation */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={handlePrevDay}
              className="p-2 rounded-full bg-[#3e2802] hover:bg-[#2a1c01] text-[#ffa300] transition-colors duration-200"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-[#ffa300] font-medium">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
            <button 
              onClick={handleNextDay}
              className="p-2 rounded-full bg-[#3e2802] hover:bg-[#2a1c01] text-[#ffa300] transition-colors duration-200"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={handleToday}
              className="px-3 py-1 rounded-md bg-[#3e2802] hover:bg-[#2a1c01] text-[#ffa300] transition-colors duration-200 text-sm"
            >
              Today
            </button>
          </div>
        </div>
        
        <div className="flex gap-6">
          {/* Left side - Appointments for selected date */}
          <div className="w-1/4 min-w-[300px] bg-[#1e1b1b]">
            <button
              onClick={() => setShowUserSelectionModal(true)}
              className="w-full px-4 py-2 mb-4 bg-[#ffa300] text-[#1e1b1b] rounded-lg hover:bg-[#ffb733] transition-colors flex items-center justify-center space-x-2"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>Create Appointment</span>
            </button>

            <h2 className="text-xl font-bold mb-4 text-[#ffa300]">Appointments for {format(selectedDate, 'MMMM d, yyyy')}</h2>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {todayAppointments.map((appointment) => (
                <div key={appointment.id}>
                  <div 
                    className={`bg-[#3e2802] p-3 rounded-lg cursor-pointer hover:bg-[#2a1f02] ${
                      selectedAppointment?.id === appointment.id ? 'border-2 border-[#ffa300]' : ''
                    }`}
                    onClick={() => viewAppointmentDetails(appointment)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[#ffa300] font-medium">{appointment.userName}</p>
                        <p className="text-white text-sm">{appointment.startTime}</p>
                        <p className="text-white capitalize text-sm">{appointment.serviceType}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        appointment.status === 'scheduled' ? 'bg-blue-500 text-white' :
                        appointment.status === 'in-progress' ? 'bg-yellow-500 text-white' :
                        appointment.status === 'completed' ? 'bg-green-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>

                    {/* Appointment Details Section - Inline */}
                    {selectedAppointment && selectedAppointment.id === appointment.id && (
                      <div className="mt-2 mb-2 bg-[#2a1f02] p-4 rounded-lg">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <p className="text-sm text-gray-300">Customer</p>
                            <p className="font-medium text-[#ffa300]">{selectedAppointment.userName || 'Unknown User'}</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-300">Service Type</p>
                            <p className="font-medium text-[#ffa300] capitalize">{selectedAppointment.serviceType}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-300">Time</p>
                            <p className="font-medium text-[#ffa300]">{selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-300">Duration</p>
                            <p className="font-medium text-[#ffa300]">{selectedAppointment.duration ? `${selectedAppointment.duration} minutes` : 'N/A'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-300">Status</p>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              selectedAppointment.status === 'scheduled' ? 'bg-blue-500 text-white' :
                              selectedAppointment.status === 'in-progress' ? 'bg-yellow-500 text-white' :
                              selectedAppointment.status === 'completed' ? 'bg-green-500 text-white' :
                              'bg-red-500 text-white'
                            }`}>
                              {selectedAppointment.status}
                            </span>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-300">Stall</p>
                            <p className="font-medium text-[#ffa300]">{selectedAppointment.stallName || `Stall ${selectedAppointment.stallId.substring(0, 4)}`}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-300">Created At</p>
                            <p className="font-medium text-[#ffa300]">{selectedAppointment.createdAt.toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap justify-end gap-2 mt-4">
                          {selectedAppointment.status === 'scheduled' && (
                            <button 
                              onClick={() => updateAppointmentStatus(selectedAppointment.id, 'in-progress')}
                              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            >
                              Start Service
                            </button>
                          )}
                          {selectedAppointment.status === 'in-progress' && (
                            <button 
                              onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Complete Service
                            </button>
                          )}
                          {(selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'in-progress') && (
                            <button 
                              onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Cancel Service
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(null);
                            }}
                            className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded hover:bg-[#2a2525]"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right side - Service Toggle and Stall Grid - Make wider */}
          <div className="flex-1 bg-[#1e1b1b] min-w-0">
            {/* Service Type Toggle Buttons */}
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => {
                  setSelectedService('shower');
                  setSelectedTrailerId(null); // Reset trailer selection when changing service
                }}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedService === 'shower'
                    ? 'bg-[#ffa300] text-[#1e1b1b]'
                    : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1f02]'
                }`}
              >
                Showers
              </button>
              <button
                onClick={() => {
                  setSelectedService('laundry');
                  setSelectedTrailerId(null); // Reset trailer selection when changing service
                }}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedService === 'laundry'
                    ? 'bg-[#ffa300] text-[#1e1b1b]'
                    : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
                }`}
              >
                Laundry
              </button>
            </div>
            
            {/* Trailer Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedTrailerId(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTrailerId === null
                    ? 'bg-[#ffa300] text-[#1e1b1b]'
                    : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1f02]'
                }`}
              >
                All Trailers
              </button>
              
              {trailers
                .filter(trailer => 
                  stalls.some(stall => 
                    stall.trailerGroup === trailer.id && 
                    stall.serviceType === selectedService
                  )
                )
                .map(trailer => (
                  <button
                    key={trailer.id}
                    onClick={() => setSelectedTrailerId(trailer.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedTrailerId === trailer.id
                        ? 'bg-[#ffa300] text-[#1e1b1b]'
                        : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1f02]'
                    }`}
                  >
                    {trailer.name}
                  </button>
                ))
              }
            </div>

            <StallGrid
              stalls={stalls}
              trailers={trailers}
              appointments={todayAppointments}
              startTime={companyStartTime}
              endTime={companyEndTime}
              selectedService={selectedService}
              selectedTrailerId={selectedTrailerId}
              selectedTimeSlot={selectedTimeSlot}
              updateAppointmentStatus={updateAppointmentStatus}
              onTimeSlotSelect={handleTimeSlotSelect}
            />
          </div>
        </div>

        {/* Add the Stall Status Section */}
        <StallStatusSection
          stalls={stalls}
          trailers={trailers}
          onStatusChange={handleStallStatusChange}
        />

        {/* Mobile appointment details modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:hidden">
            <div className="bg-[#3e2802] text-[#ffa300] p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Appointment Details</h3>
                <button 
                  onClick={closeAppointmentDetails}
                  className="text-[#ffa300] hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-300">Customer</p>
                  <p className="font-medium capitalize">{selectedAppointment.userName || 'Unknown User'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-300">Service Type</p>
                  <p className="font-medium capitalize">{selectedAppointment.serviceType}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-300">Time</p>
                  <p className="font-medium">{selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-300">Duration</p>
                  <p className="font-medium">{selectedAppointment.duration ? `${selectedAppointment.duration} minutes` : 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-300">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedAppointment.status === 'scheduled' ? 'bg-blue-500 text-white' :
                    selectedAppointment.status === 'in-progress' ? 'bg-yellow-500 text-white' :
                    selectedAppointment.status === 'completed' ? 'bg-green-500 text-white' :
                    'bg-red-500 text-white'
                  }`}>
                    {selectedAppointment.status}
                  </span>
                </div>
                
                <div>
                  <p className="text-sm text-gray-300">Stall</p>
                  <p className="font-medium text-[#ffa300]">{selectedAppointment.stallName || `Stall ${selectedAppointment.stallId.substring(0, 4)}`}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-300">Created At</p>
                  <p className="font-medium text-[#ffa300]">{selectedAppointment.createdAt.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-2">
                <button 
                  onClick={closeAppointmentDetails}
                  className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded hover:bg-[#2a2525]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 