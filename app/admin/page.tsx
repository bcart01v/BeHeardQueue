'use client';
export const dynamic = 'force-dynamic';
// We can use Client for this page, it's not data intensive.

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, setDoc, query, where, arrayUnion, getDoc } from 'firebase/firestore';
import { Trailer } from '@/types/trailer';
import { Stall, ServiceType, StallStatus } from '@/types/stall';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { 
  BuildingOfficeIcon, 
  TruckIcon, 
  QueueListIcon,
  UsersIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Company } from '@/types/company';
import { HaircutAvailability } from '@/types/haircutAvailability';
import { format } from 'date-fns';
import CompanySignupLink from './components/CompanySignupLink';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'client' | 'software-owner';
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<Company>({
    id: '',
    name: '',
    description: '',
    ownerId: '',
    openTime: '09:00',
    closeTime: '17:00',
    openDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    maxBookingDays: 30,
    availableServices: {
      shower: true,
      laundry: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isAddingTrailer, setIsAddingTrailer] = useState(false);
  const [isAddingStall, setIsAddingStall] = useState(false);
  const [newTrailer, setNewTrailer] = useState<Partial<Trailer>>({
    name: '',
    startTime: '',
    endTime: '',
    duration: 30,
    bufferTime: 15,
    slotsPerBlock: 4,
    stalls: [],
    location: ''
  });
  const [newStall, setNewStall] = useState<Partial<Stall>>({
    name: '',
    status: 'available',
    serviceType: 'shower',
    trailerGroup: ''
  });
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [editingTrailer, setEditingTrailer] = useState<Partial<Trailer> | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const addTrailerFormRef = useRef<HTMLDivElement>(null);
  const addStallFormRef = useRef<HTMLDivElement>(null);
  const editTrailerFormRef = useRef<HTMLDivElement>(null);
  const editStallFormRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('company-settings');
  const companySettingsRef = useRef<HTMLDivElement>(null);
  const trailersRef = useRef<HTMLDivElement>(null);
  const stallsRef = useRef<HTMLDivElement>(null);
  const usersRef = useRef<HTMLDivElement>(null);
  const signUpLinksRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    email: '',
    role: 'client',
    companyId: '',
    firstName: '',
    lastName: ''
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState<Omit<Company, 'id'>>({
    name: '',
    description: '',
    ownerId: '',
    openTime: '09:00',
    closeTime: '17:00',
    openDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    maxBookingDays: 30,
    availableServices: {
      shower: true,
      laundry: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const addCompanyFormRef = useRef<HTMLDivElement>(null);
  const editCompanyFormRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Haircut availability state
  const [haircutAvailabilities, setHaircutAvailabilities] = useState<HaircutAvailability[]>([]);
  const [isAddingHaircutAvailability, setIsAddingHaircutAvailability] = useState(false);
  const [newHaircutAvailability, setNewHaircutAvailability] = useState<Partial<HaircutAvailability>>({
    date: new Date(),
    startTime: '09:00',
    endTime: '17:00',
    appointmentDuration: 30,
    maxAppointments: 10
  });
  const [editingHaircutAvailability, setEditingHaircutAvailability] = useState<HaircutAvailability | null>(null);
  const haircutAvailabilityRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data() as User);
          }
        }
        await Promise.all([
          fetchCompanySettings(),
          fetchTrailers(),
          fetchStalls(),
          fetchUsers(),
          fetchCompanies()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const fetchCompanySettings = async () => {
    const settingsDoc = await getDocs(collection(db, 'companySettings'));
    if (!settingsDoc.empty) {
      setCompanySettings(settingsDoc.docs[0].data() as Company);
    }
  };

  const fetchTrailers = async () => {
    try {
      const trailersQuery = query(collection(db, 'trailers'));
      const trailersSnapshot = await getDocs(trailersQuery);
      const trailersData: Trailer[] = trailersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          companyId: data.companyId || '',
          startTime: data.startTime || '09:00',
          endTime: data.endTime || '17:00',
          duration: data.duration || 30,
          bufferTime: data.bufferTime || 5,
          slotsPerBlock: data.slotsPerBlock || 1,
          stalls: data.stalls || [],
          location: data.location || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
      setTrailers(trailersData);
    } catch (error) {
      console.error('Error fetching trailers:', error);
    }
  };

  const fetchStalls = async () => {
    try {
      const stallsQuery = query(collection(db, 'stalls'));
      const stallsSnapshot = await getDocs(stallsQuery);
      const stallsData: Stall[] = stallsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          companyId: data.companyId || '',
          trailerGroup: data.trailerGroup || '',
          status: data.status || 'available',
          serviceType: data.serviceType || 'shower',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
      setStalls(stallsData);
    } catch (error) {
      console.error('Error fetching stalls:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        // For backward compatibility, handle both companyId and companyIds
        const companyId = data.companyId || (data.companyIds && data.companyIds.length > 0 ? data.companyIds[0] : '');
        return {
          id: doc.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: data.role || 'client',
          companyId: companyId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const companiesData = companiesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          ownerId: data.ownerId || '',
          openTime: data.openTime || '09:00',
          closeTime: data.closeTime || '17:00',
          openDays: data.openDays || {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
          },
          maxBookingDays: data.maxBookingDays || 30,
          availableServices: data.availableServices || {
            shower: true,
            laundry: true
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Company;
      });
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleCompanySettingsUpdate = async () => {
    if (!currentCompany) return;
    
    try {
      // Ensure all required fields are properly initialized
      const updatedSettings = {
        ...companySettings,
        openDays: companySettings.openDays || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        maxBookingDays: companySettings.maxBookingDays || 30,
        availableServices: companySettings.availableServices || {
          shower: true,
          laundry: true
        },
        updatedAt: new Date()
      };
      
      const companyRef = doc(db, 'companies', currentCompany.id);
      await updateDoc(companyRef, updatedSettings);
      
      // Update local state
      setCompanies(companies.map(company => 
        company.id === currentCompany.id 
          ? { ...company, ...updatedSettings }
          : company
      ));
      
      setIsEditingCompany(false);
      alert('Company settings updated successfully');
    } catch (error) {
      console.error('Error updating company settings:', error);
      alert('Failed to update company settings');
    }
  };

  const handleAddTrailer = async () => {
    try {
      if (!currentCompany?.id || !newTrailer.name || !newTrailer.startTime || !newTrailer.endTime) {
        alert('Please select a company and fill in all required fields');
        return;
      }

      const now = Timestamp.now();
      const trailerData = {
        name: newTrailer.name,
        companyId: currentCompany.id,
        startTime: newTrailer.startTime,
        endTime: newTrailer.endTime,
        duration: newTrailer.duration || 30,
        bufferTime: newTrailer.bufferTime || 15,
        slotsPerBlock: newTrailer.slotsPerBlock || 4,
        stalls: [],
        location: newTrailer.location || '',
        createdAt: now,
        updatedAt: now
      };

      const trailerRef = await addDoc(collection(db, 'trailers'), trailerData);
      const trailerId = trailerRef.id;

      const newTrailerWithDates = {
        id: trailerId,
        name: trailerData.name,
        companyId: trailerData.companyId,
        startTime: trailerData.startTime,
        endTime: trailerData.endTime,
        duration: trailerData.duration,
        bufferTime: trailerData.bufferTime,
        slotsPerBlock: trailerData.slotsPerBlock,
        stalls: trailerData.stalls,
        location: trailerData.location,
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      };

      setTrailers([...trailers, newTrailerWithDates]);
      setIsAddingTrailer(false);
      setNewTrailer({
        name: '',
        startTime: '',
        endTime: '',
        duration: 30,
        bufferTime: 15,
        slotsPerBlock: 4,
        location: ''
      });
    } catch (error) {
      console.error('Error adding trailer:', error);
      alert('Failed to add trailer');
    }
  };

  const handleAddStall = async () => {
    try {
      if (!currentCompany?.id || !newStall.name || !newStall.trailerGroup) {
        alert('Please select a company and fill in all required fields');
        return;
      }

      const now = Timestamp.now();
      const stallData = {
        name: newStall.name,
        companyId: currentCompany.id,
        trailerGroup: newStall.trailerGroup,
        status: newStall.status || 'available',
        serviceType: newStall.serviceType || 'shower',
        createdAt: now,
        updatedAt: now
      };

      const stallRef = await addDoc(collection(db, 'stalls'), stallData);
      const stallId = stallRef.id;

      const newStallWithDates = {
        id: stallId,
        name: stallData.name,
        companyId: stallData.companyId,
        trailerGroup: stallData.trailerGroup,
        status: stallData.status,
        serviceType: stallData.serviceType,
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      };

      setStalls([...stalls, newStallWithDates]);
      setIsAddingStall(false);
      setNewStall({
        name: '',
        trailerGroup: '',
        status: 'available',
        serviceType: 'shower'
      });
    } catch (error) {
      console.error('Error adding stall:', error);
      alert('Failed to add stall');
    }
  };

  const handleUpdateStall = async (stall: Stall) => {
    try {
      if (!stall.id) return;

      const stallRef = doc(db, 'stalls', stall.id);
      const updateData = {
        ...stall,
        updatedAt: Timestamp.now()
      };
      await updateDoc(stallRef, updateData);
      
      setStalls(stalls.map(s => s.id === stall.id ? { ...stall, updatedAt: new Date() } : s));
      setEditingStall(null);
    } catch (error) {
      console.error('Error updating stall:', error);
    }
  };

  const handleDeleteStall = async (stallId: string) => {
    if (!confirm('Are you sure you want to delete this stall?')) {
      return;
    }
    await deleteDoc(doc(db, 'stalls', stallId));
    fetchStalls();
  };

  const handleEditStallName = (name: string) => {
    if (!editingStall) return;
    setEditingStall({ ...editingStall, name });
  };

  const handleEditStallStatus = (status: StallStatus) => {
    if (!editingStall) return;
    setEditingStall({ ...editingStall, status });
  };

  const handleUpdateTrailer = async (trailer: Trailer) => {
    try {
      if (!trailer.id) return;

      const trailerRef = doc(db, 'trailers', trailer.id);
      const updateData = {
        ...trailer,
        updatedAt: Timestamp.now()
      };
      await updateDoc(trailerRef, updateData);
      
      setTrailers(trailers.map(t => t.id === trailer.id ? { ...trailer, updatedAt: new Date() } : t));
      setEditingTrailer(null);
    } catch (error) {
      console.error('Error updating trailer:', error);
    }
  };

  const handleDeleteTrailer = async (trailerId: string) => {
    if (!confirm('Are you sure you want to delete this trailer?')) {
      return;
    }
    await deleteDoc(doc(db, 'trailers', trailerId));
    fetchTrailers();
  };

  const handleEditTrailerName = (name: string) => {
    if (!editingTrailer) return;
    setEditingTrailer({ ...editingTrailer, name });
  };

  const handleEditTrailerTimes = (field: 'startTime' | 'endTime', value: string) => {
    if (!editingTrailer) return;
    setEditingTrailer({ ...editingTrailer, [field]: value });
  };

  const handleEditTrailerSettings = (field: 'duration' | 'bufferTime' | 'slotsPerBlock', value: number) => {
    if (!editingTrailer) return;
    setEditingTrailer({ ...editingTrailer, [field]: value });
  };

  // Geolocation Funtions

  const handleEditTrailerLocation = (location: string) => {
    if (!editingTrailer) return;
    setEditingTrailer({ ...editingTrailer, location });
  };

  const getLocationFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      console.log('API Key available:', !!apiKey); // Will log true/false without exposing the key
      
      if (!apiKey) {
        throw new Error('Google Maps API key is not configured');
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Google Maps API response:', data);
      
      if (data.status === 'OK' && data.results && data.results[0]) {
        return data.results[0].formatted_address;
      } else {
        throw new Error(`Geocoding failed: ${data.status}`);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      return '';
    }
  };

  const handleAddressSearch = async (input: string) => {
    if (!input || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return;

    try {
      const service = new google.maps.places.AutocompleteService();
      const request = {
        input,
        types: ['address'],
        componentRestrictions: { country: 'us' },
        ...(userLocation && {
          location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
          radius: 1609.34, // 1 mile in meters
        }),
      };

      const response = await service.getPlacePredictions(request);
      setLocationSuggestions(response.predictions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    }
  };

  const handleSuggestionSelect = async (placeId: string) => {
    if (!placeId || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ placeId });
      
      if (result.results[0]) {
        const address = result.results[0].formatted_address;
        if (editingTrailer) {
          setEditingTrailer({ ...editingTrailer, location: address });
        } else {
          setNewTrailer({ ...newTrailer, location: address });
        }
        setShowSuggestions(false);
        setLocationSuggestions([]);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  const handleUseMyLocation = async (isEditing: boolean = false) => {
    setIsGettingLocation(true);
    try {
      console.log('Requesting location permission...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000, // Increased timeout to 10 seconds
            maximumAge: 0
          }
        );
      });

      console.log('Got position:', position.coords);
      
      // Store the user's location
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
      
      const address = await getLocationFromCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );

      console.log('Got address:', address);

      if (!address) {
        throw new Error('Could not get address from coordinates');
      }

      if (isEditing && editingTrailer) {
        setEditingTrailer({ ...editingTrailer, location: address });
      } else {
        setNewTrailer({ ...newTrailer, location: address });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location permission was denied. Please enable location access in your browser settings and try again.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable. Please check if:\n1. Location services are enabled\n2. You have a stable internet connection\n3. You are in an area with GPS signal');
            break;
          case error.TIMEOUT:
            alert('Location request timed out. Please try again. If the problem persists, check your internet connection and GPS signal.');
            break;
          default:
            alert('An error occurred while getting your location. Please try again or enter the location manually.');
        }
      } else {
        alert('Unable to get your location. Please enter it manually or try again later.');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const sectionRef = {
      'company-settings': companySettingsRef,
      'trailers': trailersRef,
      'stalls': stallsRef,
      'users': usersRef,
      'sign-up-links': signUpLinksRef
    }[sectionId];

    if (sectionRef?.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddUser = async () => {
    try {
      if (!newUser.email || !newUser.role || !newUser.companyId) {
        console.error('Email, role, and company are required');
        return;
      }

      // Generate a random password for the new user
      const tempPassword = Math.random().toString(36).slice(-8);

      // First, create the authentication record
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, tempPassword);
      const firebaseUser = userCredential.user;

      // Then create the Firestore document
      const userData = {
        id: firebaseUser.uid,
        email: newUser.email,
        role: newUser.role,
        companyId: newUser.companyId,
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      // Add to local state
      const userWithId = {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as User;

      setUsers([...users, userWithId]);
      setIsAddingUser(false);
      setNewUser({ email: '', role: 'client', companyId: '', firstName: '', lastName: '' });

      // Show success message with temporary password
      alert(`User created successfully!\nTemporary password: ${tempPassword}\nPlease inform the user to change their password upon first login.`);
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to create user. Please try again.');
    }
  };

  const handleUpdateUser = async (user: User | null) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.id);
      const updateData = {
        ...user,
        updatedAt: Timestamp.now()
      };
      await updateDoc(userRef, updateData);
      
      setUsers(users.map(u => u.id === user.id ? { ...user, updatedAt: new Date() } : u));
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  // Add this useEffect for the intersection observer and scroll handling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            setActiveSection(sectionId);
          }
        });
      },
      {
        root: null,
        rootMargin: '-10% 0px -90% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    );

    // Observe all sections
    const sections = [
      companySettingsRef.current,
      trailersRef.current,
      stallsRef.current,
      usersRef.current,
      signUpLinksRef.current
    ].filter(Boolean);

    sections.forEach((section) => {
      if (section) {
        observer.observe(section);
      }
    });

    // Add scroll event listener as backup
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Offset for better detection

      sections.forEach((section) => {
        if (section) {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;
          const sectionId = section.id;

          if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            setActiveSection(sectionId);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => {
      sections.forEach((section) => {
        if (section) {
          observer.unobserve(section);
        }
      });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleCreateCompany = async () => {
    try {
      const companyData: Omit<Company, 'id'> = {
        name: newCompany.name,
        description: newCompany.description,
        ownerId: newCompany.ownerId,
        openTime: newCompany.openTime || '09:00',
        closeTime: newCompany.closeTime || '17:00',
        openDays: newCompany.openDays || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        maxBookingDays: newCompany.maxBookingDays || 30,
        availableServices: newCompany.availableServices || {
          shower: true,
          laundry: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'companies'), companyData);
      const newCompanyWithId = { ...companyData, id: docRef.id } as Company;
      setCompanies([...companies, newCompanyWithId]);
      setNewCompany({
        name: '',
        description: '',
        ownerId: '',
        openTime: '09:00',
        closeTime: '17:00',
        openDays: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        maxBookingDays: 30,
        availableServices: {
          shower: true,
          laundry: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Failed to create company. Please try again.');
    }
  };

  const handleSwitchCompany = async (companyId: string) => {
    try {
      if (!auth.currentUser?.uid) {
        alert('User must be logged in');
        return;
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        currentCompanyId: companyId
      });

      // Update local state
      setCurrentCompany(companies.find(c => c.id === companyId) || null);
    } catch (error) {
      console.error('Error switching company:', error);
      alert('Failed to switch company');
    }
  };

  const handleEditCompanyName = (name: string) => {
    if (!editingCompany) return;
    setEditingCompany({ ...editingCompany, name });
  };

  const handleEditCompanyDescription = (description: string) => {
    if (!editingCompany) return;
    setEditingCompany({ ...editingCompany, description });
  };

  const handleEditCompanyOpenTime = (openTime: string) => {
    if (!editingCompany) return;
    setEditingCompany({ ...editingCompany, openTime });
  };

  const handleEditCompanyCloseTime = (closeTime: string) => {
    if (!editingCompany) return;
    setEditingCompany({ ...editingCompany, closeTime });
  };

  const handleEditCompanyOpenDays = (day: string, isOpen: boolean) => {
    if (!editingCompany) return;
    setEditingCompany({
      ...editingCompany,
      openDays: {
        ...editingCompany.openDays,
        [day]: isOpen
      }
    });
  };

  const handleUpdateCompany = async (company: Company) => {
    try {
      const companyRef = doc(db, 'companies', company.id);
      await updateDoc(companyRef, {
        ...company,
        updatedAt: Timestamp.now()
      });
      setEditingCompany(null);
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Failed to update company. Please try again.');
    }
  };

  // Add this useEffect for animation
  useEffect(() => {
    if (isAddingCompany && addCompanyFormRef.current) {
      addCompanyFormRef.current.style.maxHeight = '2000px';
      addCompanyFormRef.current.style.opacity = '1';
      addCompanyFormRef.current.style.transform = 'translateY(0)';
      addCompanyFormRef.current.style.pointerEvents = 'auto';
    } else if (addCompanyFormRef.current) {
      addCompanyFormRef.current.style.maxHeight = '0';
      addCompanyFormRef.current.style.opacity = '0';
      addCompanyFormRef.current.style.transform = 'translateY(-20px)';
      addCompanyFormRef.current.style.pointerEvents = 'none';
    }
  }, [isAddingCompany]);

  // Add this useEffect for edit animation
  useEffect(() => {
    if (editingCompany && editCompanyFormRef.current) {
      editCompanyFormRef.current.style.maxHeight = '2000px';
      editCompanyFormRef.current.style.opacity = '1';
      editCompanyFormRef.current.style.transform = 'translateY(0)';
      editCompanyFormRef.current.style.pointerEvents = 'auto';
    } else if (editCompanyFormRef.current) {
      editCompanyFormRef.current.style.maxHeight = '0';
      editCompanyFormRef.current.style.opacity = '0';
      editCompanyFormRef.current.style.transform = 'translateY(-20px)';
      editCompanyFormRef.current.style.pointerEvents = 'none';
    }
  }, [editingCompany]);

  console.log('FIREBASE PROJECT ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-black">BeHeard Queue</h1>
          {currentUser && (
            <div className="text-black">
              Welcome, {currentUser.firstName} {currentUser.lastName}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-lg h-[calc(100vh-4rem)] sticky top-0">
          <div className="p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Admin Panel</h2>
            <nav className="space-y-2">
              <button
                onClick={() => scrollToSection('company-settings')}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'company-settings'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BuildingOfficeIcon className="h-5 w-5" />
                <span>Company</span>
              </button>
              <button
                onClick={() => scrollToSection('sign-up-links')}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'sign-up-links'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LinkIcon className="h-5 w-5" />
                <span>Sign Up Links</span>
              </button>
              <button
                onClick={() => scrollToSection('trailers')}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'trailers'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <TruckIcon className="h-5 w-5" />
                <span>Trailers</span>
              </button>
              <button
                onClick={() => scrollToSection('stalls')}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'stalls'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <QueueListIcon className="h-5 w-5" />
                <span>Stalls</span>
              </button>
              <button
                onClick={() => scrollToSection('users')}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'users'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <UsersIcon className="h-5 w-5" />
                <span>Users</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Combined Company Management Section */}
            <section ref={companySettingsRef} id="company-settings" className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-black">Company Management</h2>
              </div>
              
              {/* Company Signup Link */}
              {currentCompany && (
                <div className="mb-6">
                  <CompanySignupLink 
                    companyId={currentCompany.id} 
                    companyName={currentCompany.name} 
                  />
                </div>
              )}
              
              {/* Companies Table */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-black">Companies</h3>
                  <button
                    onClick={() => setIsAddingCompany(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Add Company
                  </button>
                </div>

                {/* Add Company Form */}
                <div 
                  ref={addCompanyFormRef}
                  className="mb-6 p-4 border rounded-lg bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: '0',
                    opacity: '0',
                    transform: 'translateY(-20px)',
                    pointerEvents: 'none'
                  }}
                >
                  <h3 className="text-lg font-semibold text-black mb-4">Add New Company</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-black">Company Name</label>
                      <input
                        type="text"
                        value={newCompany.name}
                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black">Description</label>
                      <textarea
                        value={newCompany.description}
                        onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black">Opening Time</label>
                        <input
                          type="time"
                          value={newCompany.openTime}
                          onChange={(e) => setNewCompany({ ...newCompany, openTime: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Closing Time</label>
                        <input
                          type="time"
                          value={newCompany.closeTime}
                          onChange={(e) => setNewCompany({ ...newCompany, closeTime: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Open Days</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(newCompany.openDays || {
                          monday: true,
                          tuesday: true,
                          wednesday: true,
                          thursday: true,
                          friday: true,
                          saturday: false,
                          sunday: false
                        }).map(([day, isOpen]) => (
                          <label key={day} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isOpen}
                              onChange={(e) => setNewCompany({
                                ...newCompany,
                                openDays: {
                                  ...(newCompany.openDays || {
                                    monday: true,
                                    tuesday: true,
                                    wednesday: true,
                                    thursday: true,
                                    friday: true,
                                    saturday: false,
                                    sunday: false
                                  }),
                                  [day]: e.target.checked
                                }
                              })}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-black capitalize">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsAddingCompany(false)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCompany}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                      >
                        Add Company
                      </button>
                    </div>
                  </div>
                </div>

                {/* Companies Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Hours</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Open Days</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {companies.map((company) => (
                        <tr 
                          key={company.id}
                          className={`${editingCompany?.id === company.id ? 'bg-blue-50' : ''}`}
                          style={{ height: '64px' }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-black">{company.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-black">{company.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-black">{company.openTime || '09:00'} - {company.closeTime || '17:00'}</td>
                          <td className="px-6 py-4 text-black">
                            <div className="max-h-12 overflow-y-auto">
                              {Object.entries(company.openDays || {
                                monday: true,
                                tuesday: true,
                                wednesday: true,
                                thursday: true,
                                friday: true,
                                saturday: false,
                                sunday: false
                              })
                                .filter(([_, isOpen]) => isOpen)
                                .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
                                .join(', ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                // Ensure openDays is properly initialized
                                const companyWithDefaults = {
                                  ...company,
                                  openDays: company.openDays || {
                                    monday: true,
                                    tuesday: true,
                                    wednesday: true,
                                    thursday: true,
                                    friday: true,
                                    saturday: false,
                                    sunday: false
                                  }
                                };
                                setEditingCompany(companyWithDefaults);
                              }}
                              className="text-black hover:text-gray-700"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Company Settings */}
            <div 
              ref={editCompanyFormRef}
              className="mt-8 bg-white p-6 rounded-lg shadow overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: editingCompany ? '2000px' : '0',
                opacity: editingCompany ? '1' : '0',
                transform: editingCompany ? 'translateY(0)' : 'translateY(-20px)',
                pointerEvents: editingCompany ? 'auto' : 'none'
              }}
            >
              <h3 className="text-xl font-semibold text-black mb-4">Edit Company Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black">Company Name</label>
                  <input
                    type="text"
                    value={editingCompany?.name || ''}
                    onChange={(e) => handleEditCompanyName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Description</label>
                  <textarea
                    value={editingCompany?.description || ''}
                    onChange={(e) => handleEditCompanyDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black">Opening Time</label>
                    <input
                      type="time"
                      value={editingCompany?.openTime || '09:00'}
                      onChange={(e) => handleEditCompanyOpenTime(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Closing Time</label>
                    <input
                      type="time"
                      value={editingCompany?.closeTime || '17:00'}
                      onChange={(e) => handleEditCompanyCloseTime(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Open Days</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(editingCompany?.openDays || {
                      monday: true,
                      tuesday: true,
                      wednesday: true,
                      thursday: true,
                      friday: true,
                      saturday: false,
                      sunday: false
                    }).map(([day, isOpen]) => (
                      <label key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isOpen}
                          onChange={(e) => handleEditCompanyOpenDays(day, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-black capitalize">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setEditingCompany(null)}
                    className="px-4 py-2 bg-gray-200 text-black rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => editingCompany && handleUpdateCompany(editingCompany)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
              {editingCompany && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Service Availability</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="shower-service"
                        checked={editingCompany.availableServices?.shower || false}
                        onChange={(e) => setEditingCompany({
                          ...editingCompany,
                          availableServices: {
                            ...editingCompany.availableServices,
                            shower: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="shower-service" className="ml-2 block text-sm text-gray-900">
                        Shower Service Available
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="laundry-service"
                        checked={editingCompany.availableServices?.laundry || false}
                        onChange={(e) => setEditingCompany({
                          ...editingCompany,
                          availableServices: {
                            ...editingCompany.availableServices,
                            laundry: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="laundry-service" className="ml-2 block text-sm text-gray-900">
                        Laundry Service Available
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sign Up Links Section */}
            <section ref={signUpLinksRef} id="sign-up-links" className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Sign Up Links</h2>
              </div>

              {/* Company Selector for Sign Up Links */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Filter by Company</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCurrentCompany(null)}
                    className={`px-4 py-2 rounded-md ${
                      !currentCompany 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Companies
                  </button>
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setCurrentCompany(company)}
                      className={`px-4 py-2 rounded-md ${
                        currentCompany?.id === company.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {company.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign Up Links Grid */}
              <div className="grid grid-cols-1 gap-4">
                {companies
                  .filter(company => currentCompany ? company.id === currentCompany.id : true)
                  .map((company) => (
                    <div key={company.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-semibold text-black mb-2">{company.name}</h3>
                      <CompanySignupLink 
                        companyId={company.id} 
                        companyName={company.name} 
                      />
                    </div>
                  ))
                }
              </div>
            </section>

            {/* Trailers Section */}
            <section ref={trailersRef} id="trailers" className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Trailers</h2>
                <button
                  onClick={() => setIsAddingTrailer(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Trailer
                </button>
              </div>

              {/* Company Selector for Trailers */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Filter by Company</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCurrentCompany(null)}
                    className={`px-4 py-2 rounded-md ${
                      !currentCompany 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Companies
                  </button>
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setCurrentCompany(company)}
                      className={`px-4 py-2 rounded-md ${
                        currentCompany?.id === company.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {company.name}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                ref={addTrailerFormRef} 
                className="mb-6 p-4 border rounded-lg bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isAddingTrailer ? '2000px' : '0',
                  opacity: isAddingTrailer ? '1' : '0',
                  transform: isAddingTrailer ? 'translateY(0)' : 'translateY(-20px)',
                  pointerEvents: isAddingTrailer ? 'auto' : 'none'
                }}
              >
                <h3 className="text-lg font-semibold text-black mb-4">Add New Trailer</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black">Company</label>
                    <select
                      value={currentCompany?.id || ''}
                      onChange={(e) => {
                        const selectedCompany = companies.find(c => c.id === e.target.value);
                        if (selectedCompany) {
                          setCurrentCompany(selectedCompany);
                        }
                      }}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Name</label>
                    <input
                      type="text"
                      value={newTrailer.name}
                      onChange={(e) => setNewTrailer({ ...newTrailer, name: e.target.value })}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Start Time</label>
                    <input
                      type="time"
                      value={newTrailer.startTime}
                      onChange={(e) => setNewTrailer({ ...newTrailer, startTime: e.target.value })}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">End Time</label>
                    <input
                      type="time"
                      value={newTrailer.endTime}
                      onChange={(e) => setNewTrailer({ ...newTrailer, endTime: e.target.value })}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Duration (minutes)</label>
                    <input
                      type="number"
                      value={newTrailer.duration}
                      onChange={(e) => setNewTrailer({ ...newTrailer, duration: parseInt(e.target.value) })}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Buffer Time (minutes)</label>
                    <input
                      type="number"
                      value={newTrailer.bufferTime}
                      onChange={(e) => setNewTrailer({ ...newTrailer, bufferTime: parseInt(e.target.value) })}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Slots Per Block</label>
                    <input
                      type="number"
                      value={newTrailer.slotsPerBlock}
                      onChange={(e) => setNewTrailer({ ...newTrailer, slotsPerBlock: parseInt(e.target.value) })}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Location</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          ref={locationInputRef}
                          type="text"
                          value={newTrailer.location}
                          onChange={(e) => {
                            setNewTrailer({ ...newTrailer, location: e.target.value });
                            handleAddressSearch(e.target.value);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          placeholder="Address, City, State, Zip"
                          className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {showSuggestions && locationSuggestions.length > 0 && (
                          <div
                            ref={suggestionsRef}
                            className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto transform transition-all duration-200 ease-in-out origin-top"
                          >
                            {locationSuggestions.map((suggestion) => (
                              <div
                                key={suggestion.place_id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors duration-200"
                                onClick={() => handleSuggestionSelect(suggestion.place_id)}
                              >
                                {suggestion.description}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseMyLocation(false)}
                        disabled={isGettingLocation}
                        className={`mt-1 p-2 rounded-md ${
                          isGettingLocation 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        title="Use My Location"
                      >
                        <MapPinIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddTrailer}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsAddingTrailer(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {trailers
                  .filter(trailer => currentCompany ? trailer.companyId === currentCompany.id : true)
                  .map((trailer) => (
                  <div key={trailer.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-black">{trailer.name}</h3>
                      <div className="space-x-2">
                        <button
                          onClick={() => setEditingTrailer(trailer)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => trailer.id && handleDeleteTrailer(trailer.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div 
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: editingTrailer?.id === trailer.id ? '2000px' : '0',
                        opacity: editingTrailer?.id === trailer.id ? '1' : '0',
                        transform: editingTrailer?.id === trailer.id ? 'translateY(0)' : 'translateY(-20px)',
                        pointerEvents: editingTrailer?.id === trailer.id ? 'auto' : 'none'
                      }}
                    >
                      {editingTrailer?.id === trailer.id && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-black">Name</label>
                            <input
                              type="text"
                              value={editingTrailer.name}
                              onChange={(e) => handleEditTrailerName(e.target.value)}
                              className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black">Start Time</label>
                            <input
                              type="time"
                              value={editingTrailer.startTime}
                              onChange={(e) => handleEditTrailerTimes('startTime', e.target.value)}
                              className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black">End Time</label>
                            <input
                              type="time"
                              value={editingTrailer.endTime}
                              onChange={(e) => handleEditTrailerTimes('endTime', e.target.value)}
                              className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black">Duration (minutes)</label>
                            <input
                              type="number"
                              value={editingTrailer.duration}
                              onChange={(e) => handleEditTrailerSettings('duration', parseInt(e.target.value))}
                              className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black">Buffer Time (minutes)</label>
                            <input
                              type="number"
                              value={editingTrailer.bufferTime}
                              onChange={(e) => handleEditTrailerSettings('bufferTime', parseInt(e.target.value))}
                              className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black">Slots Per Block</label>
                            <input
                              type="number"
                              value={editingTrailer.slotsPerBlock}
                              onChange={(e) => handleEditTrailerSettings('slotsPerBlock', parseInt(e.target.value))}
                              className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black">Location</label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={editingTrailer.location}
                                  onChange={(e) => handleEditTrailerLocation(e.target.value)}
                                  className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUseMyLocation(true)}
                                disabled={isGettingLocation}
                                className={`mt-1 p-2 rounded-md ${
                                  isGettingLocation 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                                title="Use My Location"
                              >
                                <MapPinIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => editingTrailer && handleUpdateTrailer(editingTrailer as Trailer)}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTrailer(null)}
                              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {(!editingTrailer || editingTrailer.id !== trailer.id) && (
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Hours:</span> {trailer.startTime} - {trailer.endTime}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {trailer.duration} minutes
                        </div>
                        <div>
                          <span className="font-medium">Buffer Time:</span> {trailer.bufferTime} minutes
                        </div>
                        <div>
                          <span className="font-medium">Slots Per Block:</span> {trailer.slotsPerBlock}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Location:</span> {trailer.location}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Stalls Section */}
            <section ref={stallsRef} id="stalls" className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Stalls</h2>
                <button
                  onClick={() => setIsAddingStall(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Stall
                </button>
              </div>

              {/* Company Selector for Stalls */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Filter by Company</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCurrentCompany(null)}
                    className={`px-4 py-2 rounded-md ${
                      !currentCompany 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Companies
                  </button>
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setCurrentCompany(company)}
                      className={`px-4 py-2 rounded-md ${
                        currentCompany?.id === company.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {company.name}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                ref={addStallFormRef} 
                className="mb-6 p-4 border rounded-lg bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isAddingStall ? '2000px' : '0',
                  opacity: isAddingStall ? '1' : '0',
                  transform: isAddingStall ? 'translateY(0)' : 'translateY(-20px)',
                  pointerEvents: isAddingStall ? 'auto' : 'none'
                }}
              >
                <h3 className="text-lg font-semibold text-black mb-4">Add New Stall</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black">Company</label>
                    <select
                      value={currentCompany?.id || ''}
                      onChange={(e) => {
                        const selectedCompany = companies.find(c => c.id === e.target.value);
                        if (selectedCompany) {
                          setCurrentCompany(selectedCompany);
                        }
                      }}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Name</label>
                    <input
                      type="text"
                      value={newStall.name}
                      onChange={(e) => setNewStall({ ...newStall, name: e.target.value })}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Trailer</label>
                    <select
                      value={newStall.trailerGroup}
                      onChange={(e) => setNewStall({ ...newStall, trailerGroup: e.target.value })}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select a trailer</option>
                      {trailers
                        .filter(trailer => currentCompany && trailer.companyId === currentCompany.id)
                        .map((trailer) => (
                          <option key={trailer.id} value={trailer.id}>
                            {trailer.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Status</label>
                    <select
                      value={newStall.status}
                      onChange={(e) => setNewStall({ ...newStall, status: e.target.value as StallStatus })}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="available">Available</option>
                      <option value="in_use">In Use</option>
                      <option value="refreshing">Refreshing</option>
                      <option value="out_of_order">Out of Order</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Service Type</label>
                    <select
                      value={newStall.serviceType}
                      onChange={(e) => setNewStall({ ...newStall, serviceType: e.target.value as ServiceType })}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="shower">Shower</option>
                      <option value="laundry">Laundry</option>
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddStall}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsAddingStall(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {trailers
                  .filter(trailer => currentCompany ? trailer.companyId === currentCompany.id : true)
                  .map((trailer) => (
                  <div key={trailer.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-black">{trailer.name}</h3>
                      <button
                        onClick={() => trailer.id && handleDeleteTrailer(trailer.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete Trailer
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stalls
                        .filter((stall) => stall.trailerGroup === trailer.id)
                        .map((stall) => (
                          <div key={stall.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                            <div 
                              ref={editStallFormRef} 
                              className="space-y-4 overflow-hidden transition-all duration-300 ease-in-out"
                              style={{
                                maxHeight: editingStall?.id === stall.id ? '2000px' : '0',
                                opacity: editingStall?.id === stall.id ? '1' : '0',
                                transform: editingStall?.id === stall.id ? 'translateY(0)' : 'translateY(-20px)',
                                pointerEvents: editingStall?.id === stall.id ? 'auto' : 'none'
                              }}
                            >
                              <div>
                                <label className="block text-sm font-medium text-black">Company</label>
                                <select
                                  value={editingStall?.companyId || currentCompany?.id || ''}
                                  onChange={(e) => {
                                    if (!editingStall) return;
                                    setEditingStall({ ...editingStall, companyId: e.target.value });
                                  }}
                                  className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  required
                                >
                                  <option value="">Select a company</option>
                                  {companies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                      {company.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-black">Name</label>
                                <input
                                  type="text"
                                  value={editingStall?.name || ''}
                                  onChange={(e) => handleEditStallName(e.target.value)}
                                  className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-black">Status</label>
                                <select
                                  value={editingStall?.status || ''}
                                  onChange={(e) => handleEditStallStatus(e.target.value as StallStatus)}
                                  className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                  <option value="available">Available</option>
                                  <option value="in_use">In Use</option>
                                  <option value="refreshing">Refreshing</option>
                                  <option value="out_of_order">Out of Order</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-black">Service Type</label>
                                <select
                                  value={editingStall?.serviceType || ''}
                                  onChange={(e) => setEditingStall({ ...editingStall!, serviceType: e.target.value as ServiceType })}
                                  className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                  <option value="shower">Shower</option>
                                  <option value="laundry">Laundry</option>
                                </select>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => editingStall && handleUpdateStall(editingStall)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingStall(null)}
                                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                            {editingStall?.id !== stall.id && (
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-lg text-black">{stall.name}</p>
                                  <p className={`text-sm mt-1 px-2 py-1 rounded-full inline-block transition-colors duration-200 ${
                                    stall.status === 'available' ? 'bg-green-100 text-green-800' :
                                    stall.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                                    stall.status === 'refreshing' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {stall.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Service: {stall.serviceType.charAt(0).toUpperCase() + stall.serviceType.slice(1)}
                                  </p>
                                </div>
                                <div className="space-x-2">
                                  <button
                                    onClick={() => setEditingStall(stall)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => stall.id && handleDeleteStall(stall.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Users Section */}
            <div ref={usersRef} id="users" className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Users</h2>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Add User
                </button>
              </div>

              {/* Add User Form */}
              {isAddingUser && !editingUser && (
                <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                  <h3 className="text-lg font-medium text-black mb-4">Add New User</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black">First Name</label>
                        <input
                          type="text"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Last Name</label>
                        <input
                          type="text"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black">Email</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                        required
                      >
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                        <option value="software-owner">Software Owner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black">Company</label>
                      <select
                        value={newUser.companyId}
                        onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                        required
                      >
                        <option value="">Select a company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsAddingUser(false)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddUser}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                      >
                        Add User
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit User Form */}
              {editingUser && (
                <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                  <h3 className="text-lg font-medium text-black mb-4">Edit User</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black">First Name</label>
                        <input
                          type="text"
                          value={editingUser.firstName}
                          onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Last Name</label>
                        <input
                          type="text"
                          value={editingUser.lastName}
                          onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black">Email</label>
                      <input
                        type="email"
                        value={editingUser.email}
                        disabled
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-black"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black">Role</label>
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                        required
                      >
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                        <option value="software-owner">Software Owner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black">Company</label>
                      <select
                        value={editingUser.companyId}
                        onChange={(e) => setEditingUser({ ...editingUser, companyId: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-black"
                        required
                      >
                        <option value="">Select a company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingUser(null)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateUser(editingUser)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr 
                        key={user.id}
                        className={`${editingUser?.id === user.id ? 'bg-blue-50' : ''}`}
                        style={{ height: '64px' }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-black">{user.firstName} {user.lastName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-black">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-black">{user.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-black">
                          {(() => {
                            const company = companies.find(c => c.id === user.companyId);
                            console.log(`User ${user.email} has companyId: ${user.companyId}`);
                            console.log(`Found company:`, company);
                            console.log(`All company IDs:`, companies.map(c => c.id));
                            return company?.name || user.companyId || 'N/A';
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 