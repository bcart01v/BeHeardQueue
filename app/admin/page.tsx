'use client';
// We can use Client for this page, it's not data intensive.


import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, setDoc, query, where } from 'firebase/firestore';
import { CompanySettings } from '@/types/company';
import { Trailer } from '@/types/trailer';
import { Stall } from '@/types/stall';
import { ServiceType } from '@/types/trailer';
import { StallStatus } from '@/types/stall';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { 
  BuildingOfficeIcon, 
  TruckIcon, 
  QueueListIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  company: string;
  role: 'admin' | 'client';
  createdAt: Date;
}

export default function AdminPage() {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: '',
    openTime: '',
    closeTime: ''
  });
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isAddingTrailer, setIsAddingTrailer] = useState(false);
  const [isAddingStall, setIsAddingStall] = useState(false);
  const [newTrailer, setNewTrailer] = useState<Partial<Trailer>>({
    // Default Values, we can change any of this if guys want to?
    name: '',
    serviceType: 'shower',
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
    trailerGroup: ''
  });
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
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
  const [users, setUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    phoneNumber: '',
    role: 'client'
  });

  // Fetch initial data
  useEffect(() => {
    fetchCompanySettings();
    fetchTrailers();
    fetchStalls();
    fetchUsers();
  }, []);

  const fetchCompanySettings = async () => {
    const settingsDoc = await getDocs(collection(db, 'companySettings'));
    if (!settingsDoc.empty) {
      setCompanySettings(settingsDoc.docs[0].data() as CompanySettings);
    }
  };

  const fetchTrailers = async () => {
    const trailersSnapshot = await getDocs(collection(db, 'trailers'));
    setTrailers(trailersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trailer)));
  };

  const fetchStalls = async () => {
    const stallsSnapshot = await getDocs(collection(db, 'stalls'));
    setStalls(stallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stall)));
  };

  const fetchUsers = async () => {
    try {
      // For now, we'll fetch all users. In a real app, you'd filter by company
      // Scratch that, we're filtering by company. Just not yet...
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCompanySettingsUpdate = async () => {
    const settingsRef = doc(db, 'companySettings', 'settings');
    await setDoc(settingsRef, companySettings, { merge: true });
    setIsEditingCompany(false);
  };

  const handleAddTrailer = async () => {
    if (!newTrailer.name || !newTrailer.serviceType || !newTrailer.startTime || !newTrailer.endTime) {
      alert('Please fill in all required fields');
      return;
    }

    await addDoc(collection(db, 'trailers'), newTrailer as Trailer);
    setNewTrailer({
      name: '',
      serviceType: 'shower',
      startTime: '',
      endTime: '',
      duration: 30,
      bufferTime: 15,
      slotsPerBlock: 4,
      stalls: [],
      location: ''
    });
    setIsAddingTrailer(false);
    fetchTrailers();
  };

  const handleAddStall = async () => {
    if (!newStall.name || !newStall.trailerGroup) {
      alert('Please fill in all required fields');
      return;
    }

    await addDoc(collection(db, 'stalls'), newStall as Stall);
    setNewStall({
      name: '',
      status: 'available',
      trailerGroup: ''
    });
    setIsAddingStall(false);
    fetchStalls();
  };

  const handleUpdateStall = async (stall: Stall) => {
    if (!stall.id) return;
    await updateDoc(doc(db, 'stalls', stall.id), stall);
    setEditingStall(null);
    fetchStalls();
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
    if (!trailer.id) return;
    await updateDoc(doc(db, 'trailers', trailer.id), trailer);
    setEditingTrailer(null);
    fetchTrailers();
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

  const handleEditTrailerServiceType = (serviceType: ServiceType) => {
    if (!editingTrailer) return;
    setEditingTrailer({ ...editingTrailer, serviceType });
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
            timeout: 5000,
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
            alert('Location permission was denied. Please enable location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable. Please try again.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out. Please try again.');
            break;
          default:
            alert('An error occurred while getting your location. Please try again.');
        }
      } else {
        alert('Unable to get your location. Please enter it manually.');
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
      'users': usersRef
    }[sectionId];

    if (sectionRef?.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phoneNumber) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, 'users'), {
        ...newUser,
        company: companySettings.name, // Use current company
        createdAt: new Date()
      });
      setNewUser({
        name: '',
        email: '',
        phoneNumber: '',
        role: 'client'
      });
      setIsAddingUser(false);
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    }
  };

  const handleUpdateUser = async (user: User) => {
    if (!user.id) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
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

  // Add this useEffect for the intersection observer
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
        rootMargin: '-20% 0px -80% 0px', // This creates a smaller intersection area in the middle of the viewport
        threshold: 0
      }
    );

    // Observe all sections
    const sections = [
      companySettingsRef.current,
      trailersRef.current,
      stallsRef.current,
      usersRef.current
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
  console.log('FIREBASE PROJECT ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  return (
    
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">BeHeard Queue</h1>
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
                <span>Company Settings</span>
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
            {/* Company Settings Section */}
            <section ref={companySettingsRef} id="company-settings" className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Company Settings</h2>
                {!isEditingCompany ? (
                  <button
                    onClick={() => setIsEditingCompany(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit Settings
                  </button>
                ) : (
                  <div className="space-x-2">
                    <button
                      onClick={handleCompanySettingsUpdate}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingCompany(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black">Company Name</label>
                  <input
                    type="text"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                    disabled={!isEditingCompany}
                    className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Opening Time</label>
                  <input
                    type="time"
                    value={companySettings.openTime}
                    onChange={(e) => setCompanySettings({ ...companySettings, openTime: e.target.value })}
                    disabled={!isEditingCompany}
                    className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Closing Time</label>
                  <input
                    type="time"
                    value={companySettings.closeTime}
                    onChange={(e) => setCompanySettings({ ...companySettings, closeTime: e.target.value })}
                    disabled={!isEditingCompany}
                    className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
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
                    <label className="block text-sm font-medium text-black">Name</label>
                    <input
                      type="text"
                      value={newTrailer.name}
                      onChange={(e) => setNewTrailer({ ...newTrailer, name: e.target.value })}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Service Type</label>
                    <select
                      value={newTrailer.serviceType}
                      onChange={(e) => setNewTrailer({ ...newTrailer, serviceType: e.target.value as ServiceType })}
                      className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="shower">Shower</option>
                      <option value="laundry">Laundry</option>
                      <option value="haircut">Haircut</option>
                    </select>
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
                {trailers.map((trailer) => (
                  <div key={trailer.id} className="border rounded-lg p-4">
                    <div 
                      ref={editTrailerFormRef} 
                      className="space-y-4 overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: editingTrailer?.id === trailer.id ? '2000px' : '0',
                        opacity: editingTrailer?.id === trailer.id ? '1' : '0',
                        transform: editingTrailer?.id === trailer.id ? 'translateY(0)' : 'translateY(-20px)',
                        pointerEvents: editingTrailer?.id === trailer.id ? 'auto' : 'none'
                      }}
                    >
                      <div>
                        <label className="block text-sm font-medium text-black">Name</label>
                        <input
                          type="text"
                          value={editingTrailer?.name || ''}
                          onChange={(e) => handleEditTrailerName(e.target.value)}
                          className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Service Type</label>
                        <select
                          value={editingTrailer?.serviceType || ''}
                          onChange={(e) => handleEditTrailerServiceType(e.target.value as ServiceType)}
                          className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="shower">Shower</option>
                          <option value="laundry">Laundry</option>
                          <option value="haircut">Haircut</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Start Time</label>
                        <input
                          type="time"
                          value={editingTrailer?.startTime || ''}
                          onChange={(e) => handleEditTrailerTimes('startTime', e.target.value)}
                          className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">End Time</label>
                        <input
                          type="time"
                          value={editingTrailer?.endTime || ''}
                          onChange={(e) => handleEditTrailerTimes('endTime', e.target.value)}
                          className="mt-1 block w-full h-9 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Duration (minutes)</label>
                        <input
                          type="number"
                          value={editingTrailer?.duration || 0}
                          onChange={(e) => handleEditTrailerSettings('duration', parseInt(e.target.value))}
                          className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Buffer Time (minutes)</label>
                        <input
                          type="number"
                          value={editingTrailer?.bufferTime || 0}
                          onChange={(e) => handleEditTrailerSettings('bufferTime', parseInt(e.target.value))}
                          className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Slots Per Block</label>
                        <input
                          type="number"
                          value={editingTrailer?.slotsPerBlock || 0}
                          onChange={(e) => handleEditTrailerSettings('slotsPerBlock', parseInt(e.target.value))}
                          className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black">Location</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              ref={locationInputRef}
                              type="text"
                              value={editingTrailer?.location || ''}
                              onChange={(e) => {
                                handleEditTrailerLocation(e.target.value);
                                handleAddressSearch(e.target.value);
                              }}
                              onFocus={() => setShowSuggestions(true)}
                              placeholder="Address, City, State, Zip"
                              className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                          onClick={() => editingTrailer && handleUpdateTrailer(editingTrailer)}
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
                    {editingTrailer?.id !== trailer.id && (
                      <>
                        <h3 className="text-lg font-semibold text-black">{trailer.name}</h3>
                        <p className="text-black">Service Type: {trailer.serviceType}</p>
                        <p className="text-black">Hours: {trailer.startTime} - {trailer.endTime}</p>
                        <p className="text-black">Location: {trailer.location}</p>
                        <div className="mt-2 space-x-2">
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
                      </>
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
                      {trailers.map((trailer) => (
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
                {trailers.map((trailer) => (
                  <div key={trailer.id} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-black mb-4">{trailer.name}</h3>
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
            <section ref={usersRef} id="users" className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add User
                </button>
              </div>

              {/* Add User Form */}
              <div 
                className="mb-6 p-4 border rounded-lg bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isAddingUser ? '2000px' : '0',
                  opacity: isAddingUser ? '1' : '0',
                  transform: isAddingUser ? 'translateY(0)' : 'translateY(-20px)',
                  pointerEvents: isAddingUser ? 'auto' : 'none'
                }}
              >
                <h3 className="text-lg font-semibold text-black mb-4">Add New User</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black">Name</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Phone Number</label>
                    <input
                      type="tel"
                      value={newUser.phoneNumber}
                      onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'client' })}
                      className="mt-1 block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddUser}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsAddingUser(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        {editingUser?.id === user.id ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={editingUser.name}
                                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                className="block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="email"
                                value={editingUser.email}
                                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                className="block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="tel"
                                value={editingUser.phoneNumber}
                                onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                                className="block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'client' })}
                                className="block w-full h-8 text-black rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              >
                                <option value="client">Client</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.createdAt.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleUpdateUser(editingUser)}
                                className="text-green-600 hover:text-green-900 mr-4"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.createdAt.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => setEditingUser(user)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 