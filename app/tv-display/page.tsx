'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parseISO } from 'date-fns';

interface Company {
  id: string;
  name: string;
  description: string;
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
}

interface Appointment {
  id: string;
  userId: string;
  companyId: string;
  serviceType: 'shower' | 'laundry' | 'haircut';
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  stallId: string;
  stallName?: string;
  userName?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Stall {
  id: string;
  name: string;
  serviceType: 'shower' | 'laundry' | 'haircut';
  trailerGroup: string;
  status?: string;
}

interface Trailer {
  id: string;
  name: string;
}

export default function TVDisplayPage() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  
  const [company, setCompany] = useState<Company | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number>(-1);
  
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  
  // Generate time slots between company open and close time
  const generateTimeSlots = (startTime: string, endTime: string) => {
    const slots: string[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
      slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }
    
    return slots;
  };
  
  // Get current time in HH:mm format
  const getCurrentTimeString = () => {
    return format(new Date(), 'HH:mm');
  };
  
  // Find the closest time slot to the current time
  const findClosestTimeSlot = (slots: string[], currentTime: string) => {
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    let closestIndex = 0;
    let minDiff = Infinity;
    
    slots.forEach((slot, index) => {
      const [slotHour, slotMinute] = slot.split(':').map(Number);
      const slotTimeMinutes = slotHour * 60 + slotMinute;
      const diff = Math.abs(slotTimeMinutes - currentTimeMinutes);
      
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  };
  
  // Format time for display
  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Get status color for appointment
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
  
  // Get stall status for a specific time
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
      const appStartTime = app.startTime;
      const appEndTime = app.endTime;
      
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
  
  // Fetch company data
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        
        if (companyDoc.exists()) {
          const companyData = companyDoc.data() as Company;
          setCompany({ ...companyData, id: companyDoc.id });
          
          // Generate time slots based on company hours
          const slots = generateTimeSlots(companyData.openTime, companyData.closeTime);
          setTimeSlots(slots);
          
          // Set current time and find closest time slot
          const currentTimeStr = getCurrentTimeString();
          setCurrentTime(currentTimeStr);
          const closestIndex = findClosestTimeSlot(slots, currentTimeStr);
          setCurrentTimeIndex(closestIndex);
        } else {
          console.error('Company not found');
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
      }
    };
    
    fetchCompanyData();
  }, [companyId]);
  
  // Fetch stalls and trailers
  useEffect(() => {
    const fetchStallsAndTrailers = async () => {
      if (!companyId) return;
      
      try {
        // Fetch stalls
        const stallsQuery = query(
          collection(db, 'stalls'),
          where('companyId', '==', companyId),
          where('serviceType', '==', 'shower')
        );
        const stallsSnapshot = await getDocs(stallsQuery);
        const stallsData = stallsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Stall[];
        setStalls(stallsData);
        
        // Get unique trailer IDs from stalls
        const trailerIds = [...new Set(stallsData.map(stall => stall.trailerGroup))];
        
        // Fetch trailers
        const trailersData: Trailer[] = [];
        for (const trailerId of trailerIds) {
          const trailerDoc = await getDoc(doc(db, 'trailers', trailerId));
          if (trailerDoc.exists()) {
            trailersData.push({
              id: trailerDoc.id,
              ...trailerDoc.data()
            } as Trailer);
          }
        }
        setTrailers(trailersData);
      } catch (error) {
        console.error('Error fetching stalls and trailers:', error);
      }
    };
    
    fetchStallsAndTrailers();
  }, [companyId]);
  
  // Fetch appointments and set up real-time listener
  useEffect(() => {
    if (!companyId) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Query for today's appointments
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('companyId', '==', companyId),
      where('date', '>=', Timestamp.fromDate(today)),
      where('date', '<=', Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))),
      where('serviceType', '==', 'shower')
    );
    
    // Set up real-time listener
    const unsubscribeAppointments = onSnapshot(appointmentsQuery, async (snapshot) => {
      try {
        // Get all users for this company to map IDs to names
        const usersQuery = query(
          collection(db, 'users'),
          where('companyId', '==', companyId)
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
          where('companyId', '==', companyId)
        );
        const stallsSnapshot = await getDocs(stallsQuery);
        const stallsMap = new Map();
        
        stallsSnapshot.forEach(doc => {
          const stallData = doc.data();
          stallsMap.set(doc.id, stallData.name || `Stall ${doc.id.substring(0, 4)}`);
        });
        
        const appointmentsData: Appointment[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const stallName = stallsMap.get(data.stallId) || `Stall ${data.stallId.substring(0, 4)}`;
          const userName = usersMap.get(data.userId) || `User ${data.userId.substring(0, 4)}`;
          
          const appointment: Appointment = {
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
          };
          
          appointmentsData.push(appointment);
        });
        
        // Sort appointments by time
        appointmentsData.sort((a, b) => {
          // Convert time strings to Date objects for proper comparison
          const [hoursA, minutesA] = a.startTime.split(':').map(Number);
          const [hoursB, minutesB] = b.startTime.split(':').map(Number);
          
          const timeA = new Date(today);
          timeA.setHours(hoursA, minutesA, 0, 0);
          
          const timeB = new Date(today);
          timeB.setHours(hoursB, minutesB, 0, 0);
          
          // Compare the Date objects
          return timeA.getTime() - timeB.getTime();
        });
        
        setAppointments(appointmentsData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing appointments:', error);
      }
    });
    
    return () => {
      unsubscribeAppointments();
    };
  }, [companyId]);
  
  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const newCurrentTime = getCurrentTimeString();
      setCurrentTime(newCurrentTime);
      
      if (timeSlots.length > 0) {
        const newClosestIndex = findClosestTimeSlot(timeSlots, newCurrentTime);
        setCurrentTimeIndex(newClosestIndex);
        
        // Scroll to current time after a short delay to ensure the grid is rendered
        setTimeout(() => {
          if (timeSlotsRef.current) {
            const timeRow = timeSlotsRef.current.querySelector(`[data-time-index="${newClosestIndex}"]`);
            if (timeRow) {
              timeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 500);
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [timeSlots]);
  
  // Filter stalls based on service type
  const filteredStalls = stalls.filter(stall => stall.serviceType === 'shower');
  
  // Filter trailers that have shower stalls
  const filteredTrailers = trailers.filter(trailer => 
    filteredStalls.some(stall => stall.trailerGroup === trailer.id)
  );
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl font-bold text-black">Loading...</div>
      </div>
    );
  }
  
  if (!companyId || !company) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl font-bold text-black">Company not found</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* Current Time Display */}
      <div className="fixed top-2 right-4 bg-black text-white px-4 py-2 rounded-lg text-xl font-bold z-50">
        {formatTimeForDisplay(currentTime)}
      </div>
      
      {/* Stall Grid */}
      <div className="flex flex-col h-screen border border-gray-300 overflow-hidden pt-16" ref={timeSlotsRef}>
        {/* Header - Trailers and Stalls */}
        <div className="flex border-b border-gray-300">
          <div className="w-24 flex-shrink-0 bg-gray-100 text-black font-bold p-2 text-center border-r border-gray-300">Time</div>
          {filteredTrailers.map(trailer => (
            <div key={trailer.id} className="flex-1">
              <div className="text-center font-bold p-2 bg-gray-100 text-black border-b border-gray-300">{trailer.name}</div>
              <div className="flex">
                {filteredStalls.filter(stall => stall.trailerGroup === trailer.id)
                  .map(stall => {
                    const currentStatus = getStallStatus(stall.id, currentTime);
                    
                    return (
                      <div 
                        key={stall.id} 
                        className="flex-1 text-center p-2 border-r border-gray-300 bg-gray-100 text-black"
                      >
                        <div className="font-medium">{stall.name}</div>
                        {currentStatus.userName && (
                          <div className="text-xs mt-1 text-black opacity-75">
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
        
        {/* Time slots and stall status */}
        <div className="flex flex-col relative flex-grow overflow-y-auto">
          {timeSlots.map((time, index) => (
            <div 
              key={time} 
              className="flex border-b border-gray-300 relative"
              data-time-index={index}
            >
              <div className="w-24 flex-shrink-0 p-2 text-sm font-medium text-black bg-gray-100 border-r border-gray-300 sticky left-0 z-10">
                {formatTimeForDisplay(time)}
              </div>
              {filteredTrailers.map(trailer => (
                <div key={`${trailer.id}-${time}`} className="flex-1 flex">
                  {filteredStalls.filter(stall => stall.trailerGroup === trailer.id)
                    .map(stall => {
                      const stallStatus = getStallStatus(stall.id, time);
                      const showColor = stallStatus.status !== 'available';
                      
                      return (
                        <div 
                          key={`${stall.id}-${time}`} 
                          className={`flex-1 h-12 border-r border-gray-300 ${
                            showColor ? getStatusColor(stallStatus.status) : 'bg-white'
                          } relative group`}
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
    </div>
  );
}