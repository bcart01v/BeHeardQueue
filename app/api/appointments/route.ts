import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { Stall } from '@/types/stall';
import { Trailer } from '@/types/trailer';
import { Company } from '@/types/company';
import { format, parseISO } from 'date-fns';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, companyId, date, preferredTime, userLocation } = body;

    // 1. Get company data to check open days
    const companyDoc = await getDocs(query(collection(db, 'companies'), where('id', '==', companyId)));
    if (companyDoc.empty) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    const company = companyDoc.docs[0].data() as Company;

    // Check if the selected day is an open day
    const selectedDate = new Date(date);
    const dayIndex = selectedDate.getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[dayIndex];
    
    if (!company.openDays[dayOfWeek as keyof typeof company.openDays]) {
      return NextResponse.json(
        { error: 'Selected day is not an open day for this company' },
        { status: 400 }
      );
    }

    // 2. Get all stalls for the company (regardless of status)
    const stallsQuery = query(
      collection(db, 'stalls'),
      where('companyId', '==', companyId)
    );
    const stallsSnapshot = await getDocs(stallsQuery);
    const allStalls = stallsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Stall[];

    // 3. Get all trailers for the company
    const trailersQuery = query(
      collection(db, 'trailers'),
      where('companyId', '==', companyId)
    );
    const trailersSnapshot = await getDocs(trailersQuery);
    const trailers = trailersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trailer[];

    // 4. Get all appointments for the selected date
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('companyId', '==', companyId),
      where('date', '==', Timestamp.fromDate(selectedDate))
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    const existingAppointments = appointmentsSnapshot.docs.map(doc => doc.data());

    // 5. Sort trailers by distance if user location is provided
    if (userLocation) {
      trailers.sort((a, b) => {
        const distanceA = calculateDistance(userLocation, a.location);
        const distanceB = calculateDistance(userLocation, b.location);
        return distanceA - distanceB;
      });
    }

    // 6. Find the best available stall and trailer
    let selectedStall = null;
    let selectedTrailer = null;

    // Try each trailer in order of proximity
    for (const trailer of trailers) {
      // Find stalls for this trailer
      const trailerStalls = allStalls.filter(stall => stall.trailerGroup === trailer.id);
      
      // Check each stall's availability based on existing appointments only
      // IGNORE the stall's current status completely
      for (const stall of trailerStalls) {
        const stallAppointments = existingAppointments.filter(app => app.stallId === stall.id);
        const isTimeSlotAvailable = !stallAppointments.some(app => {
          return (
            (preferredTime >= app.startTime && preferredTime < app.endTime) ||
            (addMinutesToTime(preferredTime, stall.duration ?? 30) > app.startTime && 
             addMinutesToTime(preferredTime, stall.duration ?? 30) <= app.endTime)
          );
        });

        if (isTimeSlotAvailable) {
          selectedStall = stall;
          selectedTrailer = trailer;
          break;
        }
      }
      
      if (selectedStall && selectedTrailer) break;
    }

    if (!selectedStall || !selectedTrailer) {
      return NextResponse.json(
        { error: 'No available stalls found for the selected time' },
        { status: 404 }
      );
    }

    // 7. Create the appointment
    const appointmentDate = new Date(date);
    console.log('Creating appointment with date:', {
      originalDate: date,
      parsedDate: appointmentDate.toISOString(),
      timestamp: Timestamp.fromDate(appointmentDate).toDate().toISOString()
    });
    
    const appointmentData = {
      userId,
      companyId,
      stallId: selectedStall.id,
      trailerId: selectedTrailer.id,
      date: Timestamp.fromDate(appointmentDate),
      startTime: preferredTime,
      endTime: addMinutesToTime(preferredTime, selectedStall.duration ?? 30),
      status: 'scheduled',
      serviceType: selectedStall.serviceType || 'shower',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    console.log('Appointment data being created:', appointmentData);
    
    const appointmentRef = await addDoc(collection(db, 'appointments'), appointmentData);
    
    console.log('Appointment created with ID:', appointmentRef.id);

    return NextResponse.json({
      success: true,
      appointmentId: appointmentRef.id,
      stall: selectedStall,
      trailer: selectedTrailer,
      distance: userLocation ? calculateDistance(userLocation, selectedTrailer.location) : null
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two points
function calculateDistance(point1: { lat: number; lng: number }, point2: string) {
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

function toRad(value: number) {
  return value * Math.PI / 180;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes);
  return formatTimeForDisplay(format(date, 'HH:mm'));
}

// Add a helper function to format time for display
function formatTimeForDisplay(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
} 