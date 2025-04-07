'use client';

import { useAuth } from './AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { updateEmail } from 'firebase/auth';
import { User, UserRole } from '@/types/user';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Type guard function to check if user is admin
function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

// Profile Edit Modal Component
function ProfileEditModal({ 
  isOpen, 
  onClose, 
  user, 
  onUpdate,
  onProfilePhotoChange
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: User | null; 
  onUpdate: (updatedUser: Partial<User>) => Promise<void>;
  onProfilePhotoChange: (file: File | null) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);

  // Initialize form with user data when modal opens
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setProfilePhotoPreview(user.profilePhoto || null);
    }
  }, [user]);

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onProfilePhotoChange(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
    }
  };

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
        profilePhoto: profilePhotoPreview || undefined,
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
              Profile Photo
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-[#3e2802] flex items-center justify-center">
                {profilePhotoPreview ? (
                  <img 
                    src={profilePhotoPreview} 
                    alt="Profile preview" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#ffa300]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleProfilePhotoChange}
                className="block w-full text-sm text-[#ffa300] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#3e2802] file:text-[#ffa300] hover:file:bg-[#2a1c01]"
              />
            </div>
          </div>

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

export default function FloatingHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  const handleLogout = async () => {
    try {
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
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

  const handleUpdateProfile = async (updatedUser: Partial<User>) => {
    if (!user?.id) return;
    
    try {
      // Upload new profile photo if provided
      let profilePhotoURL = updatedUser.profilePhoto;
      if (profilePhotoFile) {
        profilePhotoURL = await uploadProfilePhoto(profilePhotoFile);
      }

      // Update user document in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        ...updatedUser,
        profilePhoto: profilePhotoURL,
        updatedAt: new Date()
      });
      
      // If email was changed, update auth email
      if (updatedUser.email && updatedUser.email !== user.email) {
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

      // Clear the profile photo file after successful update
      setProfilePhotoFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile. Please try again.');
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-[#ffa300] shadow-md z-50">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href={isAdmin(user) ? "/admin_home" : "/userDashboard"} className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold text-[#3e2802]">BeHeard Queue</h1>
            </Link>
            
            <div className="flex items-center space-x-4">
              {!loading && (
                <>
                  {user ? (
                    <div className="flex items-center space-x-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-[#3e2802]">Welcome back,</p>
                        <p className="font-semibold text-lg text-[#3e2802]">
                          {user.firstName} {user.lastName}
                        </p>
                      </div>
                      <div className="hidden sm:flex space-x-4">
                        {isAdmin(user) && (
                          <>
                            <Link
                              href="/admin_settings"
                              className="bg-[#3e2802] text-[#ffa300] px-3 py-1.5 rounded-md hover:bg-[#2a1c01] transition-colors duration-200 text-sm flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              Company Settings
                            </Link>
                            <Link
                              href="/admin_dashboard"
                              className="bg-[#3e2802] text-[#ffa300] px-3 py-1.5 rounded-md hover:bg-[#2a1c01] transition-colors duration-200 text-sm flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Today's Dashboard
                            </Link>
                          </>
                        )}
                        {!isAdmin(user) && (
                          <button
                            onClick={() => setShowProfileModal(true)}
                            className="bg-[#3e2802] text-[#ffa300] px-3 py-1.5 rounded-md hover:bg-[#2a1c01] transition-colors duration-200 text-sm flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          className="bg-[#3e2802] text-[#ffa300] px-3 py-1.5 rounded-md hover:bg-[#2a1c01] transition-colors duration-200 text-sm flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                      {/* Mobile menu button */}
                      <div className="sm:hidden relative">
                        <button
                          onClick={() => setShowMobileMenu(!showMobileMenu)}
                          className="bg-[#3e2802] text-[#ffa300] p-2 rounded-md hover:bg-[#2a1c01] transition-colors duration-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </button>
                        {/* Mobile menu dropdown */}
                        {showMobileMenu && (
                          <div className="absolute right-0 mt-2 w-48 bg-[#1e1b1b] rounded-md shadow-lg py-1 z-50">
                            <div className="px-4 py-2 border-b border-[#3e2802]">
                              <p className="text-sm text-[#ffa300]">Welcome back,</p>
                              <p className="font-semibold text-[#ffa300]">
                                {user.firstName} {user.lastName}
                              </p>
                            </div>
                            {isAdmin(user) && (
                              <>
                                <Link
                                  href="/admin_settings"
                                  onClick={() => setShowMobileMenu(false)}
                                  className="w-full text-left px-4 py-2 text-sm text-[#ffa300] hover:bg-[#3e2802] flex items-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  Company Settings
                                </Link>
                                <Link
                                  href="/admin_dashboard"
                                  onClick={() => setShowMobileMenu(false)}
                                  className="w-full text-left px-4 py-2 text-sm text-[#ffa300] hover:bg-[#3e2802] flex items-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  Today's Dashboard
                                </Link>
                              </>
                            )}
                            {!isAdmin(user) && (
                              <button
                                onClick={() => {
                                  setShowMobileMenu(false);
                                  setShowProfileModal(true);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-[#ffa300] hover:bg-[#3e2802] flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Profile
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowMobileMenu(false);
                                handleLogout();
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-[#ffa300] hover:bg-[#3e2802] flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Logout
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex space-x-4">
                      <Link 
                        href="/login" 
                        className="bg-[#3e2802] text-[#ffa300] px-3 py-1.5 rounded-md hover:bg-[#2a1c01] transition-colors duration-200 text-sm"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/register"
                        className="bg-[#3e2802] text-[#ffa300] px-3 py-1.5 rounded-md hover:bg-[#2a1c01] transition-colors duration-200 text-sm"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setProfilePhotoFile(null);
        }}
        user={user}
        onUpdate={handleUpdateProfile}
        onProfilePhotoChange={setProfilePhotoFile}
      />
    </>
  );
} 