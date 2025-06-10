'use client';
export const dynamic = 'force-dynamic';
// We can use Client for this page, it's not data intensive.

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, setDoc, query, where, arrayUnion, getDoc } from 'firebase/firestore';
import { Trailer } from '@/types/trailer';
import { Stall, ServiceType, StallStatus } from '@/types/stall';
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
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Company } from '@/types/company';
import { createBubbleUser } from '@/lib/bubble';
import { useAdminGuard } from '../hooks/useAdminGuard';
import { User } from '@/types/user';
import { useTheme } from '../context/ThemeContext';
import { getThemeColor, getUIColor } from '../colors';

// Import components
import CompanyManagement from './components/CompanyManagement';
import SignUpLinks from './components/SignUpLinks';
import Trailers from './components/Trailers';
import Stalls from './components/Stalls';
import Users from './components/Users';

// Helper function to geocode an address
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('Google Maps API key is not configured');
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data.status === 'OK' && data.results && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// Helper function to convert coordinates to address
async function getLocationFromCoordinates(latitude: number, longitude: number): Promise<string> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
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
    
    if (data.status === 'OK' && data.results && data.results[0]) {
      return data.results[0].formatted_address;
    } else {
      throw new Error(`Geocoding failed: ${data.status}`);
    }
  } catch (error) {
    console.error('Error getting address:', error);
    return '';
  }
}

export default function AdminPage() {
  const { authorized, loading } = useAdminGuard();
  const { theme } = useTheme();

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('company-settings');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);

  // Section refs
  const companySettingsRef = useRef<HTMLDivElement>(null);
  const trailersRef = useRef<HTMLDivElement>(null);
  const stallsRef = useRef<HTMLDivElement>(null);
  const usersRef = useRef<HTMLDivElement>(null);
  const signUpLinksRef = useRef<HTMLDivElement>(null);

  // Fetch functions
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
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedIntake: data.completedIntake ?? false
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

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            setCurrentCompany(userDoc.data() as Company);
          }
        }
        await Promise.all([
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

  // Handle section visibility
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

    return () => {
      sections.forEach((section) => {
        if (section) {
          observer.unobserve(section);
        }
      });
    };
  }, []);

  // Handler functions
  const handleCreateCompany = async (company: Omit<Company, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'companies'), company);
      const newCompanyWithId = { ...company, id: docRef.id } as Company;
      setCompanies([...companies, newCompanyWithId]);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Failed to create company. Please try again.');
    }
  };

  const handleUpdateCompany = async (company: Company) => {
    try {
      const companyRef = doc(db, 'companies', company.id);
      await updateDoc(companyRef, {
        ...company,
        updatedAt: Timestamp.now()
      });
      setCompanies(companies.map(c => c.id === company.id ? company : c));
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Failed to update company. Please try again.');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'companies', companyId));
      setCompanies(companies.filter(c => c.id !== companyId));
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Failed to delete company');
    }
  };

  const handleCreateTrailer = async (trailer: Omit<Trailer, 'id'>) => {
    try {
      const geo = await geocodeAddress(trailer.location);
      if (!geo) {
        alert('Could not determine latitude/longitude for this address. Please check the address and try again.');
        return;
      }
      const trailerData = {
        ...trailer,
        lat: geo.lat,
        lng: geo.lng,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const docRef = await addDoc(collection(db, 'trailers'), trailerData);
      const newTrailerWithId = { ...trailerData, id: docRef.id };
      setTrailers(prev => [...prev, newTrailerWithId]);
    } catch (error) {
      console.error('Error adding trailer:', error);
      alert('Failed to add trailer');
    }
  };

  const handleUpdateTrailer = async (trailer: Trailer) => {
    try {
      const trailerRef = doc(db, 'trailers', trailer.id);
      const now = Timestamp.now();
      let lat = trailer.lat;
      let lng = trailer.lng;
      if (trailer.location) {
        const geo = await geocodeAddress(trailer.location);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }
      await updateDoc(trailerRef, {
        ...trailer,
        lat,
        lng,
        updatedAt: now
      });
      setTrailers(prev => prev.map(t => t.id === trailer.id ? { ...trailer, lat, lng, updatedAt: now.toDate() } : t));
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

  const handleCreateStall = async (stall: Omit<Stall, 'id'>) => {
    try {
      const now = Timestamp.now();
      const stallData = {
        ...stall,
        createdAt: now.toDate(),
        updatedAt: now.toDate()
      };
      const stallRef = await addDoc(collection(db, 'stalls'), stallData);
      const newStallWithId = {
        ...stallData,
        id: stallRef.id
      };
      setStalls([...stalls, newStallWithId as unknown as Stall]);
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

  const handleCreateUser = async (user: Omit<User, "id">): Promise<void> => {
    try {
      setIsLoading(true);
      // Generate a random temp password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Create a new auth instance for user creation
      const secondaryAuth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, tempPassword);
      
      const newUser: User = {
        ...user,
        id: userCredential.user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', newUser.id), {
        ...newUser,
        createdAt: Timestamp.fromDate(newUser.createdAt),
        updatedAt: Timestamp.fromDate(newUser.updatedAt)
      });
      
      await createBubbleUser(newUser);
      await fetchUsers();

      // Send password reset email so the user can set their own password
      await sendPasswordResetEmail(secondaryAuth, user.email);
      
      // Sign out from the secondary auth instance
      await signOut(secondaryAuth);
      
      alert('User created! A password setup email has been sent to the user.');
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (user: User): Promise<void> => {
    try {
      setIsLoading(true);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        ...user,
        updatedAt: Timestamp.fromDate(new Date())
      });
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    } finally {
      setIsLoading(false);
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

  const handleUseMyLocation = async (isEditing: boolean = false): Promise<string> => {
    setIsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const address = await getLocationFromCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );

      if (!address) {
        throw new Error('Could not get address from coordinates');
      }
      return address;
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
      return '';
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSearch = async (input: string) => {
    if (!input || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return;

    try {
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

      return result.formatted_address;
    } catch (error) {
      console.error('Error getting location from place ID:', error);
      return '';
    }
  };

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

  if (loading || isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${getThemeColor(theme, 'background')}`}>
        <div className={`text-xl ${getThemeColor(theme, 'text')}`}>Loading...</div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className={`min-h-screen ${getThemeColor(theme, 'background')}`}>
      <div className="flex flex-col md:flex-row mt-16">
        {/* Sidebar Navigation */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-48 ${getThemeColor(theme, 'primary')} shadow-lg md:fixed md:h-[calc(100vh-4rem)] md:top-16 z-10`}>
          <div className="p-3 mt-8">
            <h2 className={`text-lg font-bold ${getThemeColor(theme, 'textHeader')} mb-4`}>Admin Panel</h2>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  scrollToSection('company-settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeSection === 'company-settings'
                    ? `${getThemeColor(theme, 'secondary')} ${getThemeColor(theme, 'text')}`
                    : `${getThemeColor(theme, 'textHeader')} hover:${getThemeColor(theme, 'secondary')} hover:${getThemeColor(theme, 'text')}`
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
                    ? `${getThemeColor(theme, 'secondary')} ${getThemeColor(theme, 'text')}`
                    : `${getThemeColor(theme, 'textHeader')} hover:${getThemeColor(theme, 'secondary')} hover:${getThemeColor(theme, 'text')}`
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
                    ? `${getThemeColor(theme, 'secondary')} ${getThemeColor(theme, 'text')}`
                    : `${getThemeColor(theme, 'textHeader')} hover:${getThemeColor(theme, 'secondary')} hover:${getThemeColor(theme, 'text')}`
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
                    ? `${getThemeColor(theme, 'secondary')} ${getThemeColor(theme, 'text')}`
                    : `${getThemeColor(theme, 'textHeader')} hover:${getThemeColor(theme, 'secondary')} hover:${getThemeColor(theme, 'text')}`
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
                    ? `${getThemeColor(theme, 'secondary')} ${getThemeColor(theme, 'text')}`
                    : `${getThemeColor(theme, 'textHeader')} hover:${getThemeColor(theme, 'secondary')} hover:${getThemeColor(theme, 'text')}`
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
            <div ref={companySettingsRef} id="company-settings">
              <CompanyManagement
                companies={companies}
                currentCompany={currentCompany}
                setCurrentCompany={setCurrentCompany}
                handleCreateCompany={handleCreateCompany}
                handleUpdateCompany={handleUpdateCompany}
                handleDeleteCompany={handleDeleteCompany}
              />
            </div>

            <div ref={signUpLinksRef} id="sign-up-links">
              <SignUpLinks
                companies={companies}
                currentCompany={currentCompany}
                setCurrentCompany={setCurrentCompany}
              />
            </div>

            <div ref={trailersRef} id="trailers">
              <Trailers
                trailers={trailers}
                companies={companies}
                currentCompany={currentCompany}
                setCurrentCompany={setCurrentCompany}
                handleCreateTrailer={handleCreateTrailer}
                handleUpdateTrailer={handleUpdateTrailer}
                handleDeleteTrailer={handleDeleteTrailer}
                handleUseMyLocation={handleUseMyLocation}
                handleAddressSearch={handleAddressSearch}
                handleSuggestionClick={handleSuggestionClick}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                locationSuggestions={locationSuggestions}
              />
            </div>

            <div ref={stallsRef} id="stalls">
              <Stalls
                stalls={stalls}
                companies={companies}
                trailers={trailers}
                currentCompany={currentCompany}
                setCurrentCompany={setCurrentCompany}
                handleCreateStall={handleCreateStall}
                handleUpdateStall={handleUpdateStall}
                handleDeleteStall={handleDeleteStall}
              />
            </div>

            <div ref={usersRef} id="users">
              <Users
                users={users}
                companies={companies}
                currentCompany={currentCompany}
                setCurrentCompany={setCurrentCompany}
                handleCreateUser={handleCreateUser}
                handleUpdateUser={handleUpdateUser}
                handleDeleteUser={handleDeleteUser}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 