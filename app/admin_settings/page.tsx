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
  LinkIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { db, storage } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Company } from '@/types/company';
import { HaircutAvailability } from '@/types/haircutAvailability';
import { format } from 'date-fns';
import CompanySignupLink from './components/CompanySignupLink';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createBubbleUser } from '@/lib/bubble';
import { useAdminGuard } from '../hooks/useAdminGuard';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  companyId: string;
  profilePhoto?: string; // URL to the profile photo
  createdAt: Date;
  updatedAt: Date;
  phone?: string;
}

export default function AdminPage() {
  const { authorized, loading } = useAdminGuard();
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
      laundry: true,
      haircut: false
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
    companyId: '',
    startTime: '09:00',
    endTime: '17:00',
    stalls: [],
    location: ''
  });
  const [newStall, setNewStall] = useState<Partial<Stall>>({
    name: '',
    companyId: '',
    trailerGroup: '',
    status: 'available',
    serviceType: 'shower',
    duration: 30,
    bufferTime: 15
  });
  const [editingTrailer, setEditingTrailer] = useState<Partial<Trailer> | null>(null);
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
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
    role: 'user',
    companyId: '',
    firstName: '',
    lastName: '',
    profilePhoto: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [totalUsers, setTotalUsers] = useState(0);
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
      laundry: true,
      haircut: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const addCompanyFormRef = useRef<HTMLDivElement>(null);
  const editCompanyFormRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [editingProfilePhotoFile, setEditingProfilePhotoFile] = useState<File | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#131b1b]">
        <div className="text-xl text-[#ffa300]">Loading...</div>
      </div>
    );
  }

  if (!authorized) return null;

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
          stalls: data.stalls || [],
          location: data.location || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Trailer;
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
          description: data.description || '',
          companyId: data.companyId || '',
          trailerGroup: data.trailerGroup || '',
          startTime: data.startTime || '09:00',
          endTime: data.endTime || '17:00',
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
            laundry: true,
            haircut: false
          },
          status: data.status || 'available',
          serviceType: data.serviceType || 'shower',
          duration: data.duration || 30,
          bufferTime: data.bufferTime || 15,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Stall;
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
        return {
          id: doc.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: data.role || 'user',
          companyId: data.companyId || '',
          profilePhoto: data.profilePhoto || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
      setTotalUsers(usersData.length);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
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
            laundry: true,
            haircut: false
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
          laundry: true,
          haircut: false
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
    if (!newTrailer.name || !newTrailer.startTime || !newTrailer.endTime || !newTrailer.location) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const trailerData = {
        name: newTrailer.name,
        companyId: currentCompany?.id || '',
        startTime: newTrailer.startTime,
        endTime: newTrailer.endTime,
        stalls: [],
        location: newTrailer.location,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'trailers'), trailerData);
      const newTrailerWithId = { ...trailerData, id: docRef.id };
      setTrailers(prev => [...prev, newTrailerWithId]);
      setNewTrailer({
        name: '',
        startTime: '',
        endTime: '',
        stalls: [],
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
        duration: newStall.duration || 30,
        bufferTime: newStall.bufferTime || 15,
        createdAt: now,
        updatedAt: now
      };

      const stallRef = await addDoc(collection(db, 'stalls'), stallData);
      const stallId = stallRef.id;

      const newStallWithDates = {
        id: stallId,
        ...stallData,
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      };

      setStalls([...stalls, newStallWithDates]);
      setIsAddingStall(false);
      setNewStall({
        name: '',
        companyId: '',
        trailerGroup: '',
        status: 'available',
        serviceType: 'shower',
        duration: 30,
        bufferTime: 15
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
        name: stall.name,
        companyId: stall.companyId,
        trailerGroup: stall.trailerGroup,
        status: stall.status,
        serviceType: stall.serviceType,
        duration: stall.duration,
        bufferTime: stall.bufferTime,
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
      const trailerRef = doc(db, 'trailers', trailer.id);
      const now = Timestamp.now();
      await updateDoc(trailerRef, {
        name: trailer.name,
        companyId: trailer.companyId,
        startTime: trailer.startTime || '09:00',
        endTime: trailer.endTime || '17:00',
        stalls: trailer.stalls,
        location: trailer.location,
        updatedAt: now
      });
      setTrailers(prev => prev.map(t => t.id === trailer.id ? { ...trailer, updatedAt: now.toDate() } : t));
      setEditingTrailer(null);
    } catch (error) {
      console.error('Error updating trailer:', error);
      alert('Failed to update trailer');
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

  const handleEditTrailerLocation = (value: string) => {
    if (editingTrailer) {
      setEditingTrailer({
        ...editingTrailer,
        location: value
      });
    }
  };

  // Geolocation Functions
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
      // Wait for Google Maps API to load if needed
      if (typeof google === 'undefined') {
        console.error('Google Maps API not loaded');
        return;
      }

      const service = new google.maps.places.AutocompleteService();
      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        service.getPlacePredictions(
          {
            input,
            types: ['address'],
            componentRestrictions: { country: 'us' },
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              reject(new Error(`Places service failed: ${status}`));
            }
          }
        );
      });

      console.log('Got predictions:', predictions);
      setLocationSuggestions(predictions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching for address:', error);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (placeId: string) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode({ placeId }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
            resolve(results[0]);
          } else {
            reject(new Error(`Geocoder failed: ${status}`));
          }
        });
      });

      console.log('Got geocoded result:', result);
      return result.formatted_address;
    } catch (error) {
      console.error('Error getting location from place ID:', error);
      return '';
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

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isEditing) {
        setEditingProfilePhotoFile(file);
      } else {
        setProfilePhotoFile(file);
      }
    }
  };

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, `profile-photos/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw error;
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

      // Upload profile photo if provided
      let profilePhotoURL = '';
      if (profilePhotoFile) {
        profilePhotoURL = await uploadProfilePhoto(profilePhotoFile);
      }

      // Then create the Firestore document
      const userData = {
        id: firebaseUser.uid,
        email: newUser.email,
        role: newUser.role as 'admin' | 'user',
        companyId: newUser.companyId,
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
        phone: newUser.phone || '',
        profilePhoto: profilePhotoURL,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      // Create user in Bubble
      const bubbleSuccess = await createBubbleUser(userData);
      if (!bubbleSuccess) {
        console.warn('Failed to create user in Bubble, but user was created in BeHeard');
      }

      // Add to local state
      setUsers([...users, userData]);
      setIsAddingUser(false);
      setNewUser({ email: '', role: 'user', companyId: '', firstName: '', lastName: '', profilePhoto: '' });
      setProfilePhotoFile(null);

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
      // Upload new profile photo if provided
      let profilePhotoURL = user.profilePhoto || '';
      if (editingProfilePhotoFile) {
        profilePhotoURL = await uploadProfilePhoto(editingProfilePhotoFile);
      }

      const userRef = doc(db, 'users', user.id);
      const updateData = {
        ...user,
        profilePhoto: profilePhotoURL,
        updatedAt: Timestamp.now()
      };
      await updateDoc(userRef, updateData);
      
      setUsers(users.map(u => u.id === user.id ? { ...user, profilePhoto: profilePhotoURL, updatedAt: new Date() } : u));
      setEditingUser(null);
      setIsAddingUser(false); // Set isAddingUser to false to collapse the form
      setNewUser({ email: '', role: 'user', companyId: '', firstName: '', lastName: '', profilePhoto: '' }); // Clear the form values
      setEditingProfilePhotoFile(null);
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
          laundry: true,
          haircut: false
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
          laundry: true,
          haircut: false
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

  // Helper function to convert 24-hour time to 12-hour format
  const formatTimeTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleCreateTrailer = async () => {
    try {
      if (!currentCompany) {
        alert('Please select a company first');
        return;
      }

      const now = Timestamp.now();
      const trailerData = {
        name: newTrailer.name || '',
        companyId: currentCompany.id,
        startTime: newTrailer.startTime || '09:00',
        endTime: newTrailer.endTime || '17:00',
        stalls: [],
        location: newTrailer.location || '',
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      };

      const docRef = await addDoc(collection(db, 'trailers'), trailerData);
      const newTrailerWithId = {
        ...trailerData,
        id: docRef.id
      };

      setTrailers(prev => [...prev, newTrailerWithId as Trailer]);
      setNewTrailer({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        location: '',
        stalls: []
      });
    } catch (error) {
      console.error('Error adding trailer:', error);
      alert('Failed to add trailer');
    }
  };

  const handleCreateStall = async () => {
    try {
      if (!currentCompany) {
        alert('Please select a company first');
        return;
      }

      const now = Timestamp.now();
      const stallData = {
        name: newStall.name || '',
        companyId: currentCompany.id,
        trailerGroup: newStall.trailerGroup || '',
        status: newStall.status || 'available',
        serviceType: newStall.serviceType || 'shower',
        duration: newStall.duration || 30,
        bufferTime: newStall.bufferTime || 15,
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      };

      const stallRef = await addDoc(collection(db, 'stalls'), stallData);
      const newStallWithId = {
        ...stallData,
        id: stallRef.id
      };

      setStalls([...stalls, newStallWithId as unknown as Stall]);
      setIsAddingStall(false);
      setNewStall({
        name: '',
        companyId: '',
        trailerGroup: '',
        status: 'available',
        serviceType: 'shower',
        duration: 30,
        bufferTime: 15
      });
    } catch (error) {
      console.error('Error adding stall:', error);
      alert('Failed to add stall');
    }
  };

  // Add this useEffect to handle dropdown positioning
  useEffect(() => {
    if (showSuggestions && locationInputRef.current && suggestionsRef.current) {
      console.log('Positioning dropdown');
      const inputRect = locationInputRef.current.getBoundingClientRect();
      suggestionsRef.current.style.position = 'fixed';
      suggestionsRef.current.style.top = `${inputRect.bottom + window.scrollY + 4}px`;
      suggestionsRef.current.style.left = `${inputRect.left}px`;
      suggestionsRef.current.style.width = `${inputRect.width}px`;
      console.log('Dropdown positioned at:', {
        top: suggestionsRef.current.style.top,
        left: suggestionsRef.current.style.left,
        width: suggestionsRef.current.style.width
      });
    }
  }, [showSuggestions, locationSuggestions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1b1b]">
        <div className="text-xl text-[#ffa300]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1b1b]">
      <div className="flex flex-col md:flex-row mt-16">
        {/* Sidebar Navigation - Hidden on mobile by default, shown when menu is open */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-48 bg-[#ffa300] shadow-lg md:fixed md:h-[calc(100vh-4rem)] md:top-16 z-10`}>
          <div className="p-3">
            <h2 className="text-lg font-bold text-[#3e2802] mb-4">Admin Panel</h2>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  scrollToSection('company-settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'company-settings'
                    ? 'bg-[#3e2802] text-[#ffa300]'
                    : 'text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                }`}
              >
                <BuildingOfficeIcon className="h-5 w-5" />
                <span>Company</span>
              </button>
              <button
                onClick={() => {
                  scrollToSection('sign-up-links');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'sign-up-links'
                    ? 'bg-[#3e2802] text-[#ffa300]'
                    : 'text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                }`}
              >
                <LinkIcon className="h-5 w-5" />
                <span>Sign Up Links</span>
              </button>
              <button
                onClick={() => {
                  scrollToSection('trailers');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'trailers'
                    ? 'bg-[#3e2802] text-[#ffa300]'
                    : 'text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                }`}
              >
                <TruckIcon className="h-5 w-5" />
                <span>Trailers</span>
              </button>
              <button
                onClick={() => {
                  scrollToSection('stalls');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'stalls'
                    ? 'bg-[#3e2802] text-[#ffa300]'
                    : 'text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                }`}
              >
                <QueueListIcon className="h-5 w-5" />
                <span>Stalls</span>
              </button>
              <button
                onClick={() => {
                  scrollToSection('users');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'users'
                    ? 'bg-[#3e2802] text-[#ffa300]'
                    : 'text-[#3e2802] hover:bg-[#3e2802] hover:text-[#ffa300]'
                }`}
              >
                <UsersIcon className="h-5 w-5" />
                <span>Users</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 md:ml-48">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Company Management Section */}
            <section ref={companySettingsRef} id="company-settings" className="bg-[#ffa300] rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#3e2802]">Company Management</h2>
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                  <h3 className="text-xl font-semibold text-[#3e2802]">Companies</h3>
                  <button
                    onClick={() => setIsAddingCompany(true)}
                    className="bg-[#3e2802] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                  >
                    Add Company
                  </button>
                </div>

                {/* Add Company Form */}
                <div 
                  ref={addCompanyFormRef}
                  className="mb-6 p-4 border-2 border-white rounded-lg bg-[#1e1b1b] overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isAddingCompany ? '2000px' : '0',
                    opacity: isAddingCompany ? '1' : '0',
                    transform: isAddingCompany ? 'translateY(0)' : 'translateY(-20px)',
                    pointerEvents: isAddingCompany ? 'auto' : 'none'
                  }}
                >
                  <h3 className="text-lg font-semibold text-[#ffa300] mb-4">Add New Company</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Company Name</label>
                      <input
                        type="text"
                        value={newCompany.name}
                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Description</label>
                      <textarea
                        value={newCompany.description}
                        onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#ffa300]">Opening Time</label>
                        <input
                          type="time"
                          value={newCompany.openTime}
                          onChange={(e) => setNewCompany({ ...newCompany, openTime: e.target.value })}
                          className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#ffa300]">Closing Time</label>
                        <input
                          type="time"
                          value={newCompany.closeTime}
                          onChange={(e) => setNewCompany({ ...newCompany, closeTime: e.target.value })}
                          className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300] mb-2">Open Days</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                              className="rounded border-[#3e2802] text-[#ffa300] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                            />
                            <span className="text-sm text-[#ffa300] capitalize">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                      <button
                        onClick={() => setIsAddingCompany(false)}
                        className="bg-[#1e1b1b] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCompany}
                        className="bg-[#3e2802] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                      >
                        Add Company
                      </button>
                    </div>
                  </div>
                </div>

                {/* Companies Table */}
                <div className="bg-[#1e1b1b] rounded-lg shadow overflow-hidden border border-[#3e2802] overflow-x-auto">
                  {/* Desktop Table View - Hidden on Mobile */}
                  <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-[#3e2802]">
                      <thead className="bg-[#3e2802]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider hidden sm:table-cell">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider hidden md:table-cell">Hours</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider hidden lg:table-cell">Open Days</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#1e1b1b] divide-y divide-[#3e2802]">
                        {companies.map((company) => (
                          <tr 
                            key={company.id}
                            className={`${editingCompany?.id === company.id ? 'bg-[#2a1c01]' : ''}`}
                            style={{ height: '64px' }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-white">{company.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-white hidden sm:table-cell">{company.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-white hidden md:table-cell">{formatTimeTo12Hour(company.openTime || '09:00')} - {formatTimeTo12Hour(company.closeTime || '17:00')}</td>
                            <td className="px-6 py-4 text-white hidden lg:table-cell">
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
                                className="text-white hover:text-[#ffa300]"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View - Hidden on Desktop */}
                  <div className="md:hidden">
                    <div className="p-4">
                      {companies.map((company) => (
                        <div 
                          key={company.id}
                          className={`mb-4 p-4 rounded-lg border border-[#3e2802] ${editingCompany?.id === company.id ? 'bg-[#2a1c01]' : 'bg-[#1e1b1b]'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-medium text-white">{company.name}</h3>
                            <button
                              onClick={() => {
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
                              className="text-[#ffa300] hover:text-white"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="text-sm text-gray-300 mb-2">{company.description}</div>
                          <div className="text-sm text-gray-300 mb-2">
                            {formatTimeTo12Hour(company.openTime || '09:00')} - {formatTimeTo12Hour(company.closeTime || '17:00')}
                          </div>
                          <div className="text-sm text-gray-300 mb-2">
                            <span className="font-medium">Open Days:</span> {
                              Object.entries(company.openDays || {
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
                                .join(', ')
                            }
                          </div>
                          <div className="text-sm text-gray-300">
                            <span className="font-medium">Services:</span> {
                              Object.entries(company.availableServices || {
                                shower: true,
                                laundry: true,
                                haircut: false
                              })
                                .filter(([_, isAvailable]) => isAvailable)
                                .map(([service]) => service.charAt(0).toUpperCase() + service.slice(1))
                                .join(', ')
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Company Settings */}
            <section 
              ref={editCompanyFormRef}
              className="bg-[#ffa300] rounded-lg shadow p-6 overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: editingCompany ? '2000px' : '0',
                opacity: editingCompany ? '1' : '0',
                transform: editingCompany ? 'translateY(0)' : 'translateY(-20px)',
                pointerEvents: editingCompany ? 'auto' : 'none'
              }}
            >
              <h3 className="text-xl font-semibold text-[#3e2802] mb-4">Edit Company Settings</h3>
              <div className="bg-[#1e1b1b] p-4 rounded-lg shadow-md mb-4 border-2 border-white">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Company Name</label>
                    <input
                      type="text"
                      value={editingCompany?.name || ''}
                      onChange={(e) => handleEditCompanyName(e.target.value)}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Description</label>
                    <textarea
                      value={editingCompany?.description || ''}
                      onChange={(e) => handleEditCompanyDescription(e.target.value)}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Opening Time</label>
                      <input
                        type="time"
                        value={editingCompany?.openTime || '09:00'}
                        onChange={(e) => handleEditCompanyOpenTime(e.target.value)}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Closing Time</label>
                      <input
                        type="time"
                        value={editingCompany?.closeTime || '17:00'}
                        onChange={(e) => handleEditCompanyCloseTime(e.target.value)}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300] mb-2">Open Days</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                            className="rounded border-[#3e2802] text-[#ffa300] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                          />
                          <span className="text-sm text-[#ffa300] capitalize">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingCompany(null)}
                      className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded-md hover:bg-[#2a1c01]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => editingCompany && handleUpdateCompany(editingCompany)}
                      className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01]"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
              {editingCompany && (
                <div className="bg-[#1e1b1b] p-4 rounded-lg shadow-md border-2 border-white">
                  <h3 className="text-lg font-medium text-[#ffa300] mb-2">Service Availability</h3>
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
                        className="h-4 w-4 text-[#ffa300] focus:ring-[#ffa300] border-[#3e2802] rounded"
                      />
                      <label htmlFor="shower-service" className="ml-2 block text-sm text-[#ffa300]">
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
                        className="h-4 w-4 text-[#ffa300] focus:ring-[#ffa300] border-[#3e2802] rounded"
                      />
                      <label htmlFor="laundry-service" className="ml-2 block text-sm text-[#ffa300]">
                        Laundry Service Available
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="haircut-service"
                        checked={editingCompany.availableServices?.haircut || false}
                        onChange={(e) => setEditingCompany({
                          ...editingCompany,
                          availableServices: {
                            ...editingCompany.availableServices,
                            haircut: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-[#ffa300] focus:ring-[#ffa300] border-[#3e2802] rounded"
                      />
                      <label htmlFor="haircut-service" className="ml-2 block text-sm text-[#ffa300]">
                        Haircut Service Available
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Sign Up Links Section */}
            <section ref={signUpLinksRef} id="sign-up-links" className="bg-[#ffa300] rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#3e2802]">Sign Up Links</h2>
              </div>

              {/* Company Selector for Sign Up Links */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-[#3e2802] mb-2">Filter by Company</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCurrentCompany(null)}
                    className={`px-4 py-2 rounded-md ${
                      currentCompany === null
                        ? 'bg-[#1e1b1b] text-white' 
                        : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
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
                          ? 'bg-[#1e1b1b] text-white' 
                          : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
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
                    <div key={company.id} className="bg-[#1e1b1b] border-2 border-white rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-semibold text-[#ffa300] mb-2">{company.name}</h3>
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
            <section ref={trailersRef} id="trailers" className="bg-[#ffa300] rounded-lg shadow p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h2 className="text-2xl font-bold text-[#3e2802]">Trailers</h2>
                <button
                  onClick={() => setIsAddingTrailer(true)}
                  className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                >
                  Add Trailer
                </button>
              </div>

              {/* Company Selector for Trailers */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-[#3e2802] mb-2">Filter by Company</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCurrentCompany(null)}
                    className={`px-4 py-2 rounded-md ${
                      currentCompany === null
                        ? 'bg-[#1e1b1b] text-white' 
                        : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
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
                          ? 'bg-[#1e1b1b] text-white' 
                          : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
                      }`}
                    >
                      {company.name}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                ref={addTrailerFormRef} 
                className="mb-6 p-4 border border-[#3e2802] rounded-lg bg-[#1e1b1b] overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isAddingTrailer ? '2000px' : '0',
                  opacity: isAddingTrailer ? '1' : '0',
                  transform: isAddingTrailer ? 'translateY(0)' : 'translateY(-20px)',
                  pointerEvents: isAddingTrailer ? 'auto' : 'none'
                }}
              >
                <h3 className="text-lg font-semibold text-[#ffa300] mb-4">Add New Trailer</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Company</label>
                    <select
                      value={currentCompany?.id || ''}
                      onChange={(e) => {
                        const selectedCompany = companies.find(c => c.id === e.target.value);
                        if (selectedCompany) {
                          setCurrentCompany(selectedCompany);
                        }
                      }}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white">Name</label>
                      <input
                        type="text"
                        value={newTrailer.name}
                        onChange={(e) => setNewTrailer({ ...newTrailer, name: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white">Location</label>
                      <div className={`relative overflow-visible transition-all duration-300 ease-in-out ${showSuggestions ? 'z-50' : ''}`}>
                        <input
                          type="text"
                          value={newTrailer.location}
                          onChange={(e) => {
                            setNewTrailer({ ...newTrailer, location: e.target.value });
                            handleAddressSearch(e.target.value);
                          }}
                          className={`mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 ${showSuggestions ? 'border-[#ffa300]' : 'border-white'} bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300] transition-all duration-300`}
                          placeholder="Enter location or use current location"
                        />
                        <button
                          onClick={() => handleUseMyLocation(false)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#ffa300] hover:text-white"
                        >
                          <MapPinIcon className="h-5 w-5" />
                        </button>
                        {showSuggestions && locationSuggestions.length > 0 && (
                          <div
                            style={{ 
                              position: 'absolute', 
                              left: 0, 
                              right: 0, 
                              zIndex: 9999,
                              minWidth: '100%',
                              overflow: 'visible',
                              transform: showSuggestions ? 'scaleY(1)' : 'scaleY(0)',
                              transformOrigin: 'top',
                              transition: 'transform 0.2s ease-in-out'
                            }}
                            className="mt-1 bg-[#1e1b1b] border-2 border-[#ffa300] rounded-md shadow-lg"
                          >
                            <div className="max-h-60 overflow-y-auto">
                              {locationSuggestions.map((suggestion) => (
                                <div
                                  key={suggestion.place_id}
                                  className="px-4 py-2 hover:bg-[#2a1c01] cursor-pointer text-[#ffa300] transition-colors duration-200"
                                  onClick={() => {
                                    setNewTrailer({ ...newTrailer, location: suggestion.description });
                                    handleSuggestionClick(suggestion.place_id);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  {suggestion.description}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white">Start Time</label>
                      <input
                        type="time"
                        value={newTrailer.startTime || '09:00'}
                        onChange={(e) => setNewTrailer({ ...newTrailer, startTime: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white">End Time</label>
                      <input
                        type="time"
                        value={newTrailer.endTime || '17:00'}
                        onChange={(e) => setNewTrailer({ ...newTrailer, endTime: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={handleCreateTrailer}
                      className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsAddingTrailer(false)}
                      className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
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
                  <div key={trailer.id} className="border border-[#3e2802] rounded-lg p-4 bg-[#1e1b1b]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                      <h3 className="text-lg font-semibold text-[#ffa300]">{trailer.name}</h3>
                      <div className="flex space-x-2 w-full sm:w-auto">
                        <button
                          onClick={() => setEditingTrailer(trailer)}
                          className="text-[#ffa300] hover:text-[#ffffff] flex-1 sm:flex-none"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => trailer.id && handleDeleteTrailer(trailer.id)}
                          className="text-[#ffa300] hover:text-[#ffffff] flex-1 sm:flex-none"
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
                            <label className="block text-sm font-medium text-[#ffa300]">Name</label>
                            <input
                              type="text"
                              value={editingTrailer.name}
                              onChange={(e) => handleEditTrailerName(e.target.value)}
                              className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#ffa300]">Location</label>
                            <div className={`relative overflow-visible transition-all duration-300 ease-in-out ${showSuggestions ? 'z-50' : ''}`}>
                              <input
                                type="text"
                                value={editingTrailer.location}
                                onChange={(e) => {
                                  setEditingTrailer({ ...editingTrailer, location: e.target.value });
                                  handleAddressSearch(e.target.value);
                                }}
                                className={`mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 ${showSuggestions ? 'border-[#ffa300]' : 'border-white'} bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300] transition-all duration-300`}
                                placeholder="Enter location or use current location"
                              />
                              <button
                                onClick={() => handleUseMyLocation(true)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#ffa300] hover:text-white"
                              >
                                <MapPinIcon className="h-5 w-5" />
                              </button>
                              {showSuggestions && locationSuggestions.length > 0 && (
                                <div
                                  style={{ 
                                    position: 'absolute', 
                                    left: 0, 
                                    right: 0, 
                                    zIndex: 9999,
                                    minWidth: '100%',
                                    overflow: 'visible'
                                  }}
                                  className="mt-1 bg-[#1e1b1b] border-2 border-white rounded-md shadow-lg"
                                >
                                  <div className="max-h-60 overflow-y-auto">
                                    {locationSuggestions.map((suggestion) => (
                                      <div
                                        key={suggestion.place_id}
                                        className="px-4 py-2 hover:bg-[#2a1c01] cursor-pointer text-[#ffa300]"
                                        onClick={() => {
                                          setEditingTrailer({ ...editingTrailer, location: suggestion.description });
                                          handleSuggestionClick(suggestion.place_id);
                                          setShowSuggestions(false);
                                        }}
                                      >
                                        {suggestion.description}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-[#ffa300]">Start Time</label>
                              <input
                                type="time"
                                value={editingTrailer.startTime || '09:00'}
                                onChange={(e) => setEditingTrailer({ ...editingTrailer, startTime: e.target.value })}
                                className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[#ffa300]">End Time</label>
                              <input
                                type="time"
                                value={editingTrailer.endTime || '17:00'}
                                onChange={(e) => setEditingTrailer({ ...editingTrailer, endTime: e.target.value })}
                                className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <button
                              onClick={() => editingTrailer && handleUpdateTrailer(editingTrailer as Trailer)}
                              className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTrailer(null)}
                              className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {(!editingTrailer || editingTrailer.id !== trailer.id) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white">
                        <div>
                          <span className="font-medium">Name:</span> {trailer.name}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {trailer.location}
                        </div>
                        <div>
                          <span className="font-medium">Operating Hours:</span> {formatTimeTo12Hour(trailer.startTime)} - {formatTimeTo12Hour(trailer.endTime)}
                        </div>
                        <div>
                          <span className="font-medium">Number of Stalls:</span> {stalls.filter(stall => stall.trailerGroup === trailer.id).length}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Stalls Section */}
            <section ref={stallsRef} id="stalls" className="bg-[#ffa300] rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#3e2802]">Stalls</h2>
                <button
                  onClick={() => setIsAddingStall(true)}
                  className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01]"
                >
                  Add Stall
                </button>
              </div>

              {/* Company Selector for Stalls */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-[#3e2802] mb-2">Filter by Company</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCurrentCompany(null)}
                    className={`px-4 py-2 rounded-md ${
                      currentCompany === null
                        ? 'bg-[#1e1b1b] text-white' 
                        : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
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
                          ? 'bg-[#1e1b1b] text-white' 
                          : 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
                      }`}
                    >
                      {company.name}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                ref={addStallFormRef} 
                className="mb-6 p-4 border border-[#3e2802] rounded-lg bg-[#1e1b1b] overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isAddingStall ? '2000px' : '0',
                  opacity: isAddingStall ? '1' : '0',
                  transform: isAddingStall ? 'translateY(0)' : 'translateY(-20px)',
                  pointerEvents: isAddingStall ? 'auto' : 'none'
                }}
              >
                <h3 className="text-lg font-semibold text-[#ffa300] mb-4">Add New Stall</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Company</label>
                    <select
                      value={currentCompany?.id || ''}
                      onChange={(e) => {
                        const selectedCompany = companies.find(c => c.id === e.target.value);
                        if (selectedCompany) {
                          setCurrentCompany(selectedCompany);
                        }
                      }}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
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
                    <label className="block text-sm font-medium text-[#ffa300]">Name</label>
                    <input
                      type="text"
                      value={newStall.name}
                      onChange={(e) => setNewStall({ ...newStall, name: e.target.value })}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Trailer</label>
                    <select
                      value={newStall.trailerGroup}
                      onChange={(e) => setNewStall({ ...newStall, trailerGroup: e.target.value })}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
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
                    <label className="block text-sm font-medium text-[#ffa300]">Status</label>
                    <select
                      value={newStall.status}
                      onChange={(e) => setNewStall({ ...newStall, status: e.target.value as StallStatus })}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                    >
                      <option value="available">Available</option>
                      <option value="in_use">In Use</option>
                      <option value="refreshing">Refreshing</option>
                      <option value="out_of_order">Out of Order</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Service Type</label>
                    <select
                      value={newStall.serviceType}
                      onChange={(e) => setNewStall({ ...newStall, serviceType: e.target.value as ServiceType })}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                    >
                      <option value="shower">Shower</option>
                      <option value="laundry">Laundry</option>
                      <option value="haircut">Haircut</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Duration (minutes)</label>
                    <input
                      type="number"
                      value={newStall.duration}
                      onChange={(e) => setNewStall({ ...newStall, duration: parseInt(e.target.value) })}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Buffer Time (minutes)</label>
                    <input
                      type="number"
                      value={newStall.bufferTime}
                      onChange={(e) => setNewStall({ ...newStall, bufferTime: parseInt(e.target.value) })}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCreateStall}
                      className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsAddingStall(false)}
                      className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded-md hover:bg-[#2a1c01]"
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
                  <div key={trailer.id} className="border border-[#3e2802] rounded-lg p-4 bg-[#1e1b1b]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">{trailer.name}</h3>
                      <button
                        onClick={() => trailer.id && handleDeleteTrailer(trailer.id)}
                        className="text-white hover:text-[#ffa300]"
                      >
                        Delete Trailer
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stalls
                        .filter((stall) => stall.trailerGroup === trailer.id)
                        .map((stall) => (
                          <div key={stall.id} className="bg-[#1e1b1b] border-2 border-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
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
                                <label className="block text-sm font-medium text-[#ffa300]">Company</label>
                                <select
                                  value={editingStall?.companyId || currentCompany?.id || ''}
                                  onChange={(e) => {
                                    if (!editingStall) return;
                                    setEditingStall({ ...editingStall, companyId: e.target.value });
                                  }}
                                  className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
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
                                <label className="block text-sm font-medium text-[#ffa300]">Name</label>
                                <input
                                  type="text"
                                  value={editingStall?.name || ''}
                                  onChange={(e) => handleEditStallName(e.target.value)}
                                  className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#ffa300]">Status</label>
                                <select
                                  value={editingStall?.status || ''}
                                  onChange={(e) => handleEditStallStatus(e.target.value as StallStatus)}
                                  className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                                >
                                  <option value="available">Available</option>
                                  <option value="in_use">In Use</option>
                                  <option value="refreshing">Refreshing</option>
                                  <option value="out_of_order">Out of Order</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#ffa300]">Service Type</label>
                                <select
                                  value={editingStall?.serviceType || ''}
                                  onChange={(e) => setEditingStall({ ...editingStall!, serviceType: e.target.value as ServiceType })}
                                  className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                                >
                                  <option value="shower">Shower</option>
                                  <option value="laundry">Laundry</option>
                                  <option value="haircut">Haircut</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#ffa300]">Duration (minutes)</label>
                                <input
                                  type="number"
                                  value={editingStall?.duration || 30}
                                  onChange={(e) => setEditingStall({ ...editingStall!, duration: parseInt(e.target.value) })}
                                  className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#ffa300]">Buffer Time (minutes)</label>
                                <input
                                  type="number"
                                  value={editingStall?.bufferTime || 15}
                                  onChange={(e) => setEditingStall({ ...editingStall!, bufferTime: parseInt(e.target.value) })}
                                  className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                                />
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => editingStall && handleUpdateStall(editingStall)}
                                  className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01]"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingStall(null)}
                                  className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded-md hover:bg-[#2a1c01]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                            {editingStall?.id !== stall.id && (
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-lg text-white">{stall.name}</p>
                                  <p className={`text-sm mt-1 px-2 py-1 rounded-full inline-block transition-colors duration-200 ${
                                    stall.status === 'available' ? 'bg-green-500 text-white' :
                                    stall.status === 'in_use' ? 'bg-blue-500 text-white' :
                                    stall.status === 'refreshing' ? 'bg-yellow-500 text-white' :
                                    'bg-red-500 text-white'
                                  }`}>
                                    {stall.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                  </p>
                                  <p className="text-sm text-white mt-1">
                                    Service: {stall.serviceType.charAt(0).toUpperCase() + stall.serviceType.slice(1)}
                                  </p>
                                </div>
                                <div className="space-x-2">
                                  <button
                                    onClick={() => setEditingStall(stall)}
                                    className="text-white hover:text-[#ffa300]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => stall.id && handleDeleteStall(stall.id)}
                                    className="text-white hover:text-[#ffa300]"
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
            <section ref={usersRef} id="users" className="bg-[#ffa300] rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#3e2802]">Users</h2>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="bg-[#3e2802] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01]"
                >
                  Add User
                </button>
              </div>

              {/* Add User Form */}
              {isAddingUser && !editingUser && (
                <div className="bg-[#1e1b1b] p-4 rounded-lg shadow-md mb-4 border-2 border-white">
                  <h3 className="text-lg font-medium text-[#ffa300] mb-4">Add New User</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#ffa300]">First Name</label>
                        <input
                          type="text"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                          className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#ffa300]">Last Name</label>
                        <input
                          type="text"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                          className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Email</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                        required
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Company</label>
                      <select
                        value={newUser.companyId}
                        onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
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
                      <label className="block text-sm font-medium text-[#ffa300]">Profile Photo</label>
                      <div className="mt-1 flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-[#3e2802] flex items-center justify-center">
                          {profilePhotoFile ? (
                            <img 
                              src={URL.createObjectURL(profilePhotoFile)} 
                              alt="Profile preview" 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserCircleIcon className="h-8 w-8 text-[#ffa300]" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleProfilePhotoChange(e)}
                          className="block w-full text-sm text-[#ffa300] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#3e2802] file:text-[#ffa300] hover:file:bg-[#2a1c01]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsAddingUser(false)}
                        className="bg-[#1e1b1b] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddUser}
                        className="bg-[#3e2802] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01]"
                      >
                        Add User
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit User Form */}
              {editingUser && (
                <div className="bg-[#1e1b1b] p-4 rounded-lg shadow-md mb-4 border-2 border-white">
                  <h3 className="text-lg font-medium text-[#ffa300] mb-4">Edit User</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#ffa300]">First Name</label>
                        <input
                          type="text"
                          value={editingUser.firstName}
                          onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                          className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#ffa300]">Last Name</label>
                        <input
                          type="text"
                          value={editingUser.lastName}
                          onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                          className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Email</label>
                      <input
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Role</label>
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                        required
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">Company</label>
                      <select
                        value={editingUser.companyId}
                        onChange={(e) => setEditingUser({ ...editingUser, companyId: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
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
                      <label className="block text-sm font-medium text-[#ffa300]">Profile Photo</label>
                      <div className="mt-1 flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-[#3e2802] flex items-center justify-center">
                          {editingProfilePhotoFile ? (
                            <img 
                              src={URL.createObjectURL(editingProfilePhotoFile)} 
                              alt="Profile preview" 
                              className="h-full w-full object-cover"
                            />
                          ) : editingUser.profilePhoto ? (
                            <img 
                              src={editingUser.profilePhoto} 
                              alt="Profile" 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserCircleIcon className="h-8 w-8 text-[#ffa300]" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleProfilePhotoChange(e, true)}
                          className="block w-full text-sm text-[#ffa300] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#3e2802] file:text-[#ffa300] hover:file:bg-[#2a1c01]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(null);
                          setIsAddingUser(false);
                          setNewUser({ email: '', role: 'user', companyId: '', firstName: '', lastName: '', profilePhoto: '' });
                        }}
                        className="bg-[#1e1b1b] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateUser(editingUser)}
                        className="bg-[#3e2802] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01]"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Table */}
              {/* Users Table */}
              <div className="bg-[#1e1b1b] rounded-lg shadow overflow-hidden border-2 border-white">
                {/* Desktop Table View - Hidden on Mobile */}
                <div className="hidden md:block">
                  <table className="min-w-full divide-y divide-[#3e2802]">
                    <thead className="bg-[#3e2802]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#1e1b1b] divide-y divide-[#3e2802]">
                      {paginatedUsers.map((user) => (
                        <tr 
                          key={user.id}
                          className={`${editingUser?.id === user.id ? 'bg-[#2a1c01]' : ''}`}
                          style={{ height: '64px' }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-white">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-[#3e2802] flex-shrink-0 mr-3">
                                {user.profilePhoto ? (
                                  <img 
                                    src={user.profilePhoto} 
                                    alt={`${user.firstName} ${user.lastName}`} 
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <UserCircleIcon className="h-full w-full text-[#ffa300] p-1" />
                                )}
                              </div>
                              <span>{user.firstName} {user.lastName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-white ${
                              user.role === 'admin' ? 'bg-blue-500' : 'bg-green-500'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white">
                            {companies.find(company => company.id === user.companyId)?.name || 'Unknown Company'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setIsAddingUser(true);
                                setNewUser({
                                  email: user.email,
                                  role: user.role,
                                  companyId: user.companyId,
                                  firstName: user.firstName,
                                  lastName: user.lastName
                                });
                              }}
                              className="text-white hover:text-[#ffa300]"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View - Hidden on Desktop */}
                <div className="md:hidden">
                  <div className="p-4">
                    {paginatedUsers.map((user) => (
                      <div 
                        key={user.id}
                        className={`mb-4 p-4 rounded-lg border border-[#3e2802] ${editingUser?.id === user.id ? 'bg-[#2a1c01]' : 'bg-[#1e1b1b]'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-[#3e2802] flex-shrink-0 mr-3">
                              {user.profilePhoto ? (
                                <img 
                                  src={user.profilePhoto} 
                                  alt={`${user.firstName} ${user.lastName}`} 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <UserCircleIcon className="h-full w-full text-[#ffa300] p-1" />
                              )}
                            </div>
                            <h3 className="text-lg font-medium text-white">{user.firstName} {user.lastName}</h3>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-white text-xs ${
                            user.role === 'admin' ? 'bg-blue-500' : 'bg-green-500'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 mb-2">{user.email}</div>
                        <div className="text-sm text-gray-300 mb-3">
                          {companies.find(company => company.id === user.companyId)?.name || 'Unknown Company'}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setIsAddingUser(true);
                              setNewUser({
                                email: user.email,
                                role: user.role,
                                companyId: user.companyId,
                                firstName: user.firstName,
                                lastName: user.lastName
                              });
                            }}
                            className="text-[#ffa300] hover:text-white"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#3e2802] px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-[#2a1c01]">
                  <div className="text-white mb-2 sm:mb-0">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === 1
                          ? 'bg-[#1e1b1b] text-[#3e2802] cursor-not-allowed'
                          : 'bg-[#1e1b1b] text-white hover:bg-[#2a1c01]'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === totalPages
                          ? 'bg-[#1e1b1b] text-[#3e2802] cursor-not-allowed'
                          : 'bg-[#1e1b1b] text-white hover:bg-[#2a1c01]'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 