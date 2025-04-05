'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/types/company';
import { createCompany, getCompaniesByOwner } from '@/lib/companies';

export default function SoftwareOwnerDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompany, setNewCompany] = useState({ 
    name: '', 
    description: '',
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
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // For now, we'll just fetch all companies without filtering by owner
        const allCompanies = await getCompaniesByOwner('all');
        setCompanies(allCompanies);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError('Failed to load companies. Please try again later.');
      }
    };

    fetchCompanies();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);

    try {
      // Using a default owner ID for now
      const company = await createCompany(
        newCompany.name,
        newCompany.description,
        'default-owner-id',
        newCompany.openTime,
        newCompany.closeTime,
        newCompany.openDays
      );
      
      setCompanies([...companies, company]);
      setNewCompany({ 
        name: '', 
        description: '',
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
        }
      });
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Failed to create company. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Software Owner Dashboard</h1>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Company Creation Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Company</h2>
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              value={newCompany.name}
              onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="companyDescription" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="companyDescription"
              value={newCompany.description}
              onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="openTime" className="block text-sm font-medium text-gray-700">
                Opening Time
              </label>
              <input
                type="time"
                id="openTime"
                value={newCompany.openTime}
                onChange={(e) => setNewCompany({ ...newCompany, openTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="closeTime" className="block text-sm font-medium text-gray-700">
                Closing Time
              </label>
              <input
                type="time"
                id="closeTime"
                value={newCompany.closeTime}
                onChange={(e) => setNewCompany({ ...newCompany, closeTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Open Days
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(newCompany.openDays).map(([day, isOpen]) => (
                <label key={day} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => setNewCompany({
                      ...newCompany,
                      openDays: {
                        ...newCompany.openDays,
                        [day]: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700 capitalize">{day}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Company'}
          </button>
        </form>
      </div>

      {/* Companies List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Companies</h2>
        {companies.length === 0 ? (
          <p className="text-gray-500">No companies created yet.</p>
        ) : (
          <div className="grid gap-4">
            {companies.map((company) => (
              <div key={company.id} className="border p-4 rounded-md">
                <h3 className="text-lg font-medium">{company.name}</h3>
                {company.description && (
                  <p className="text-gray-600 mt-1">{company.description}</p>
                )}
                <div className="mt-2 text-sm text-gray-500">
                  <p>Hours: {company.openTime} - {company.closeTime}</p>
                  <p>Open Days: {Object.entries(company.openDays)
                    .filter(([_, isOpen]) => isOpen)
                    .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
                    .join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 