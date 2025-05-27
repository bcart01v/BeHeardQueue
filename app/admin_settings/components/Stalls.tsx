import { useState } from 'react';
import { Stall, StallStatus, ServiceType } from '@/types/stall';
import { Company } from '@/types/company';
import { Trailer } from '@/types/trailer';

interface StallsProps {
  stalls: Stall[];
  companies: Company[];
  trailers: Trailer[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  handleCreateStall: (stall: Omit<Stall, 'id'>) => Promise<void>;
  handleUpdateStall: (stall: Stall) => Promise<void>;
  handleDeleteStall: (stallId: string) => Promise<void>;
}

export default function Stalls({
  stalls,
  companies,
  trailers,
  currentCompany,
  setCurrentCompany,
  handleCreateStall,
  handleUpdateStall,
  handleDeleteStall
}: StallsProps) {
  const [isAddingStall, setIsAddingStall] = useState(false);
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [closingStallId, setClosingStallId] = useState<string | null>(null);
  const [newStall, setNewStall] = useState<Partial<Stall>>({
    name: '',
    companyId: '',
    trailerGroup: '',
    status: 'available',
    serviceType: 'shower',
    duration: 30,
    bufferTime: 15
  });

  // Helper function to convert 24-hour time to 12-hour format
  const formatTimeTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get filtered trailers based on selected company
  const filteredTrailers = trailers.filter(trailer => 
    currentCompany ? trailer.companyId === currentCompany.id : true
  );

  // Helper to get color for status
  const getStatusColor = (status: StallStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-600';
      case 'in_use':
        return 'bg-blue-500';
      case 'needs_cleaning':
        return 'bg-red-500';
      case 'refreshing':
        return 'bg-yellow-500';
      case 'out_of_order':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Helper to get label for status
  const getStatusLabel = (status: StallStatus) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'in_use':
        return 'In Use';
      case 'needs_cleaning':
        return 'Needs Cleaning';
      case 'refreshing':
        return 'Refreshing';
      case 'out_of_order':
        return 'Out of Order';
      default:
        return status;
    }
  };

  // Group stalls by trailer
  const stallsByTrailer = filteredTrailers.map(trailer => ({
    trailer,
    trailerStalls: stalls.filter(stall => stall.trailerGroup === trailer.id)
  }));

  // Helper to handle closing animation
  const closeEditForm = () => {
    if (editingStall) {
      setClosingStallId(editingStall.id);
      setTimeout(() => {
        setEditingStall(null);
        setClosingStallId(null);
      }, 500); // match transition duration
    }
  };

  return (
    <section className="bg-[#ffa300] rounded-lg shadow p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-2xl font-bold text-[#3e2802]">Stalls</h2>
        <button
          onClick={() => setIsAddingStall(true)}
          className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
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
                  setNewStall({ ...newStall, companyId: selectedCompany.id });
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
            <label className="block text-sm font-medium text-[#ffa300]">Trailer Group</label>
            <select
              value={newStall.trailerGroup || ''}
              onChange={(e) => setNewStall({ ...newStall, trailerGroup: e.target.value })}
              className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
              required
            >
              <option value="">Select a trailer</option>
              {filteredTrailers.map((trailer) => (
                <option key={trailer.id} value={trailer.id}>
                  {trailer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white">Name</label>
            <input
              type="text"
              value={newStall.name}
              onChange={(e) => setNewStall({ ...newStall, name: e.target.value })}
              className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">Service Type</label>
            <select
              value={newStall.serviceType || 'shower'}
              onChange={(e) => setNewStall({ ...newStall, serviceType: e.target.value as ServiceType })}
              className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
            >
              <option value="shower">Shower</option>
              <option value="laundry">Laundry</option>
              <option value="haircut">Haircut</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white">Duration (minutes)</label>
              <input
                type="number"
                value={newStall.duration || 30}
                onChange={(e) => setNewStall({ ...newStall, duration: parseInt(e.target.value) })}
                className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Buffer Time (minutes)</label>
              <input
                type="number"
                value={newStall.bufferTime || 15}
                onChange={(e) => setNewStall({ ...newStall, bufferTime: parseInt(e.target.value) })}
                className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => handleCreateStall(newStall as Omit<Stall, 'id'>)}
              className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
            >
              Save
            </button>
            <button
              onClick={() => setIsAddingStall(false)}
              className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      
      {/* Grouped stalls by trailer */}
      <div className="space-y-8">
        {stallsByTrailer.map(({ trailer, trailerStalls }) => (
          <div key={trailer.id} className="bg-[#1e1b1b] rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{trailer.name}</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {trailerStalls.length === 0 && (
                <div className="text-white">No stalls assigned to this trailer.</div>
              )}
              {trailerStalls.map(stall => (
                <div key={stall.id} className="border border-white rounded-lg min-w-[350px] bg-[#181818] flex flex-col justify-between transition-all duration-500 px-4 py-2">
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      (editingStall?.id === stall.id && closingStallId !== stall.id)
                        ? 'max-h-[2000px] opacity-100 translate-y-0'
                        : closingStallId === stall.id
                          ? 'max-h-0 opacity-0'
                          : 'max-h-[200px] opacity-100 translate-y-0'
                    }`}
                    style={{
                      maxHeight:
                        (editingStall?.id === stall.id && closingStallId !== stall.id)
                          ? '2000px'
                          : closingStallId === stall.id
                            ? '0'
                            : '200px',
                      opacity: closingStallId === stall.id ? 0 : 1,
                      transform: 'translateY(0)'
                    }}
                  >
                    {editingStall?.id === stall.id || closingStallId === stall.id ? (
                      <form
                        className="space-y-4"
                        onSubmit={e => {
                          e.preventDefault();
                          handleUpdateStall(editingStall!);
                          closeEditForm();
                        }}
                      >
                        <div>
                          <label className="block text-sm font-medium text-[#ffa300]">Company</label>
                          <select
                            value={editingStall?.companyId || ''}
                            onChange={e => setEditingStall({ ...editingStall!, companyId: e.target.value })}
                            className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#181818] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                            required
                          >
                            {companies.map(company => (
                              <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#ffa300]">Name</label>
                          <input
                            type="text"
                            value={editingStall?.name || ''}
                            onChange={e => setEditingStall({ ...editingStall!, name: e.target.value })}
                            className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#181818] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#ffa300]">Status</label>
                          <select
                            value={editingStall?.status || 'available'}
                            onChange={e => setEditingStall({ ...editingStall!, status: e.target.value as StallStatus })}
                            className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#181818] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                            required
                          >
                            <option value="available">Available</option>
                            <option value="in_use">In Use</option>
                            <option value="needs_cleaning">Needs Cleaning</option>
                            <option value="refreshing">Refreshing</option>
                            <option value="out_of_order">Out of Order</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#ffa300]">Service Type</label>
                          <select
                            value={editingStall?.serviceType || 'shower'}
                            onChange={e => setEditingStall({ ...editingStall!, serviceType: e.target.value as ServiceType })}
                            className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#181818] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                            required
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
                            onChange={e => setEditingStall({ ...editingStall!, duration: parseInt(e.target.value) })}
                            className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#181818] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#ffa300]">Buffer Time (minutes)</label>
                          <input
                            type="number"
                            value={editingStall?.bufferTime || 15}
                            onChange={e => setEditingStall({ ...editingStall!, bufferTime: parseInt(e.target.value) })}
                            className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#181818] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                            required
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={closeEditForm}
                            className="px-4 py-2 bg-[#1e1b1b] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">{stall.name}</span>
                          <div>
                            <button
                              onClick={() => setEditingStall(stall)}
                              className="text-[#ffa300] hover:underline mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStall(stall.id)}
                              className="text-[#ffa300] hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center mb-1">
                          <span className={`text-xs px-2 py-1 rounded-full text-white ${getStatusColor(stall.status)}`}>{getStatusLabel(stall.status)}</span>
                        </div>
                        <div className="text-sm text-white">
                          Service: {stall.serviceType.charAt(0).toUpperCase() + stall.serviceType.slice(1)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
} 