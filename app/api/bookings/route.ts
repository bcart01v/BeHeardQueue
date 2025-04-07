import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Stall } from '@/types/stall';
import { Trailer } from '@/types/trailer';
import { Company } from '@/types/company';
import { format, parseISO, addMinutes } from 'date-fns';

interface Location {
  lat: number;
  lng: number;
}

interface BookingRequest {
  userId: string;
  companyId: string;
  date: string;
  serviceType: string;
  stallId: string;
  trailerId: string;
  startTime: string;
  endTime: string;
  userLocation?: Location;
}

// Helper function to calculate distance between two points
function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to add minutes to a time string
function addMinutesToTime(time: string, minutes: number): string {
  // Parse the time string (assuming format "h:mm a" or "h:mm p")
  const [timeStr, period] = time.split(' ');
  const [hours, mins] = timeStr.split(':').map(Number);
  
  // Create a date object with the time
  const date = new Date();
  let totalHours = hours;
  if (period.toLowerCase() === 'pm' && hours !== 12) {
    totalHours += 12;
  } else if (period.toLowerCase() === 'am' && hours === 12) {
    totalHours = 0;
  }
  date.setHours(totalHours, mins + minutes);
  
  // Format the time in 12-hour format with AM/PM
  return format(date, 'h:mm a');
}

// Add a helper function to parse location
function parseLocation(location: any): Location | null {
  if (!location || typeof location !== 'object') return null;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as BookingRequest;
    const { 
      userId, 
      companyId, 
      date, 
      serviceType,
      stallId,
      trailerId,
      startTime,
      endTime,
      userLocation: rawUserLocation 
    } = body;

    const userLocation = parseLocation(rawUserLocation);

    console.log('Booking request received:', {
      userId,
      companyId,
      date,
      serviceType,
      stallId,
      trailerId,
      startTime,
      endTime
    });

    if (!userId || !companyId || !date || !serviceType || !stallId || !trailerId || !startTime || !endTime) {
      console.error('Missing required fields:', { userId, companyId, date, serviceType, stallId, trailerId, startTime, endTime });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Get company data to check open days
    const companyDoc = await getDocs(query(collection(db, 'companies'), where('id', '==', companyId)));
    if (companyDoc.empty) {
      console.error('Company not found:', companyId);
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    const company = companyDoc.docs[0].data() as Company;

    // Check if the selected day is an open day
    const selectedDate = new Date(date);
    const dayIndex = selectedDate.getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[dayIndex];
    
    if (!company.openDays[dayOfWeek as keyof typeof company.openDays]) {
      console.error('Selected day is not an open day:', dayOfWeek);
      return NextResponse.json(
        { error: 'Selected day is not an open day for this company' },
        { status: 400 }
      );
    }

    // 2. Verify the stall exists and is available
    const stallDocRef = doc(db, 'stalls', stallId);
    const stallDoc = await getDoc(stallDocRef);
    if (!stallDoc.exists()) {
      console.error('Stall not found:', stallId);
      return NextResponse.json(
        { error: 'Selected stall not found' },
        { status: 404 }
      );
    }
    
    const stall = stallDoc.data() as Stall;
    
    // Only check stall status for same-day bookings
    const today = new Date();
    const isSameDay = selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate();
    
    if (isSameDay && stall.status !== 'available') {
      console.error('Stall is not available for same-day booking:', stall.status);
      return NextResponse.json(
        { error: 'Selected stall is not available' },
        { status: 400 }
      );
    }
    
    if (stall.serviceType !== serviceType) {
      console.error('Stall service type mismatch:', { stallServiceType: stall.serviceType, requestedServiceType: serviceType });
      return NextResponse.json(
        { error: 'Selected stall does not provide the requested service type' },
        { status: 400 }
      );
    }

    // 3. Verify the trailer exists
    const trailerDocRef = doc(db, 'trailers', trailerId);
    const trailerDoc = await getDoc(trailerDocRef);
    if (!trailerDoc.exists()) {
      console.error('Trailer not found:', trailerId);
      return NextResponse.json(
        { error: 'Selected trailer not found' },
        { status: 404 }
      );
    }
    
    const trailer = trailerDoc.data() as Trailer;
    
    // 4. Check if the stall belongs to the trailer
    if (stall.trailerGroup !== trailerId) {
      console.error('Stall does not belong to the selected trailer:', { stallTrailerGroup: stall.trailerGroup, selectedTrailerId: trailerId });
      return NextResponse.json(
        { error: 'Selected stall does not belong to the selected trailer' },
        { status: 400 }
      );
    }

    // 5. Check if the time slot is within the trailer's operating hours
    const [startHour, startMinute] = trailer.startTime.split(':').map(Number);
    const [endHour, endMinute] = trailer.endTime.split(':').map(Number);
    
    const trailerStartTime = new Date(selectedDate);
    trailerStartTime.setHours(startHour, startMinute, 0, 0);
    
    const trailerEndTime = new Date(selectedDate);
    trailerEndTime.setHours(endHour, endMinute, 0, 0);
    
    const appointmentStartTime = new Date(selectedDate);
    const [appStartHour, appStartMinute] = startTime.split(':').map(Number);
    appointmentStartTime.setHours(appStartHour, appStartMinute, 0, 0);
    
    if (appointmentStartTime < trailerStartTime || appointmentStartTime > trailerEndTime) {
      console.error('Appointment time is outside trailer operating hours:', { 
        appointmentStartTime: appointmentStartTime.toISOString(),
        trailerStartTime: trailerStartTime.toISOString(),
        trailerEndTime: trailerEndTime.toISOString()
      });
      return NextResponse.json(
        { error: 'Selected time slot is outside the trailer\'s operating hours' },
        { status: 400 }
      );
    }

    // 6. Check if the time slot is already booked
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('date', '==', Timestamp.fromDate(selectedDate)),
      where('stallId', '==', stallId),
      where('startTime', '==', startTime),
      where('status', '==', 'scheduled')
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    
    if (!appointmentsSnapshot.empty) {
      console.error('Time slot is already booked');
      return NextResponse.json(
        { error: 'Selected time slot is already booked' },
        { status: 400 }
      );
    }

    // 7. Create the appointment
    const appointmentData = {
      userId,
      companyId,
      stallId,
      trailerId,
      date: Timestamp.fromDate(selectedDate),
      startTime,
      endTime,
      status: 'scheduled',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    console.log('Creating appointment with data:', appointmentData);
    const appointmentRef = await addDoc(collection(db, 'appointments'), appointmentData);

    // 8. Update stall status
    const stallUpdateRef = doc(db, 'stalls', stallId);
    await updateDoc(stallUpdateRef, {
      status: 'in_use',
      updatedAt: Timestamp.now()
    });

    // 9. Return the appointment details
    const selectedTrailerLocation = parseLocation(trailer.location);
    return NextResponse.json({
      success: true,
      appointment: {
        id: appointmentRef.id,
        ...appointmentData,
        date: selectedDate,
        stall,
        trailer
      },
      distance: userLocation && selectedTrailerLocation
        ? calculateDistance(userLocation, selectedTrailerLocation)
        : null
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
} 