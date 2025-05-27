'use client';

import { useAuth } from './AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logout } from '@/lib/auth';
import { UserRole } from '@/types/user';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

interface Company {
  id: string;
  name: string;
}

export default function AdminHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) return;
      
      try {
        // Fetch all companies
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setCompanies(companiesData);
        
        // Set current company
        if (user.companyId) {
          const companyDoc = await getDoc(doc(db, 'companies', user.companyId));
          if (companyDoc.exists()) {
            setCurrentCompany({
              id: companyDoc.id,
              name: companyDoc.data().name
            });
          }
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    };

    fetchCompanies();
  }, [user]);

  const handleCompanyChange = async (companyId: string) => {
    try {
      if (!user) return;
      
      // Update user's companyId in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        companyId: companyId
      });
      
      // Find the selected company
      const selectedCompany = companies.find(c => c.id === companyId);
      if (selectedCompany) {
        setCurrentCompany(selectedCompany);
      }
      
      // Close the dropdown
      setShowCompanySelector(false);
      
      // Force a full page reload
      window.location.reload();
    } catch (error) {
      console.error('Error changing company:', error);
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date()
      });
      
      // Navigate to the appropriate page based on the new role
      if (newRole === 'user') {
        router.push('/userDashboard');
        // Refresh the page after switching to user role
        window.location.reload();
      } else {
        router.push('/resource_home');
        // Also refresh the page after switching to admin role
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // If user is not an admin, don't render this header
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <header className={`fixed top-0 left-0 right-0 ${theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'} shadow-lg z-50`}>
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/admin_home" className="flex items-center space-x-3">
            <h1 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-[#ffa300]' : 'text-[#3e2802]'}`}>BeHeard Queue</h1>
          </Link>
          
          <div className="flex items-center space-x-4">
            {!loading && user && (
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <div className="text-right hidden">
                  <p className="text-sm text-[#ffa300]">Admin</p>
                  <p className="font-semibold text-lg text-[#ffa300]">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                <div className="hidden space-x-4">
                  <Link
                    href="/admin_home"
                    className="bg-[#ffa300] text-[#3e2802] px-3 py-1.5 rounded-md hover:bg-[#e69200] transition-colors duration-200 text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Admin Home
                  </Link>
                  <Link
                    href="/resource_dashboard"
                    className="bg-[#ffa300] text-[#3e2802] px-3 py-1.5 rounded-md hover:bg-[#e69200] transition-colors duration-200 text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Resource Dashboard
                  </Link>
                  <Link
                    href="/admin_settings"
                    className="bg-[#ffa300] text-[#3e2802] px-3 py-1.5 rounded-md hover:bg-[#e69200] transition-colors duration-200 text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Company Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="bg-[#ffa300] text-[#3e2802] px-3 py-1.5 rounded-md hover:bg-[#e69200] transition-colors duration-200 text-sm flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
                
                {/* Mobile menu button - always visible */}
                <div className="relative">
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="bg-[#ffa300] text-[#3e2802] p-2 rounded-md hover:bg-[#e69200] transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  
                  {/* Mobile menu dropdown - always visible */}
                  {showMobileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#1e1b1b] rounded-md shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-[#3e2802]">
                        <p className="text-sm text-[#ffa300]">Admin</p>
                        <p className="font-semibold text-[#ffa300]">
                          {user.firstName} {user.lastName}
                        </p>
                      </div>

                      {/* Company Selector */}
                      <div className="px-4 py-2 border-b border-[#3e2802]">
                        <p className="text-sm text-[#ffa300] mb-1">Current Company</p>
                        <div className="relative">
                          <button
                            onClick={() => setShowCompanySelector(!showCompanySelector)}
                            className="w-full text-left text-[#ffa300] hover:text-[#ffb733] flex items-center justify-between"
                          >
                            <span className="truncate">{currentCompany?.name || 'Select Company'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {showCompanySelector && (
                            <div className="absolute left-0 right-0 mt-1 bg-[#2a1f02] rounded-md shadow-lg py-1">
                              {companies.map(company => (
                                <button
                                  key={company.id}
                                  onClick={() => handleCompanyChange(company.id)}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[#3e2802] ${
                                    company.id === currentCompany?.id
                                      ? 'text-[#ffa300] font-semibold'
                                      : 'text-[#ffa300]'
                                  }`}
                                >
                                  {company.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <Link
                        href="/admin_home"
                        onClick={() => setShowMobileMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-[#ffa300] hover:bg-[#3e2802] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Admin Home
                      </Link>
                      <Link
                        href="/resource_dashboard"
                        onClick={() => setShowMobileMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-[#ffa300] hover:bg-[#3e2802] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Resource Dashboard
                      </Link>
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
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 