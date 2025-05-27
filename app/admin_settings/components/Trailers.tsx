import { useState, useRef } from 'react';
import { Trailer } from '@/types/trailer';
import { Company } from '@/types/company';
import { MapPinIcon } from '@heroicons/react/24/solid';

interface TrailersProps {
  trailers: Trailer[];
  companies: Company[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  handleCreateTrailer: (trailer: Omit<Trailer, 'id'>) => Promise<void>;
  handleUpdateTrailer: (trailer: Trailer) => Promise<void>;
  handleDeleteTrailer: (trailerId: string) => Promise<void>;
  handleUseMyLocation: (isEditing: boolean) => Promise<string>;
  handleAddressSearch: (input: string) => Promise<void>;
  handleSuggestionClick: (placeId: string) => Promise<string>;
  showSuggestions: boolean;
  locationSuggestions: google.maps.places.AutocompletePrediction[];
  setShowSuggestions: (show: boolean) => void;
}

export default function Trailers({
  trailers,
  companies,
  currentCompany,
  setCurrentCompany,
  handleCreateTrailer,
  handleUpdateTrailer,
  handleDeleteTrailer,
  handleUseMyLocation,
  handleAddressSearch,
  handleSuggestionClick,
  showSuggestions,
  locationSuggestions,
  setShowSuggestions
}: TrailersProps) {
  const [isAddingTrailer, setIsAddingTrailer] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [closingTrailerId, setClosingTrailerId] = useState<string | null>(null);
  const [newTrailer, setNewTrailer] = useState<Partial<Trailer>>({
    name: '',
    companyId: '',
    startTime: '09:00',
    endTime: '17:00',
    stalls: [],
    location: ''
  });

  const addTrailerFormRef = useRef<HTMLDivElement>(null);
  const editTrailerFormRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Helper function to convert 24-hour time to 12-hour format
  const formatTimeTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper to handle closing animation
  const closeEditForm = () => {
    if (editingTrailer) {
      setClosingTrailerId(editingTrailer.id);
      setTimeout(() => {
        setEditingTrailer(null);
        setClosingTrailerId(null);
      }, 500); // match transition duration
    }
  };

  return (
    <section className="bg-[#ffa300] rounded-lg shadow p-4 md:p-6">
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
                  onClick={async (e) => {
                    e.preventDefault();
                    const address = await handleUseMyLocation(false);
                    if (address) setNewTrailer(prev => ({ ...prev, location: address }));
                  }}
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
              onClick={() => handleCreateTrailer(newTrailer as Omit<Trailer, 'id'>)}
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
              className="overflow-hidden transition-all duration-500 ease-in-out"
              style={{
                maxHeight: (editingTrailer?.id === trailer.id && closingTrailerId !== trailer.id)
                  ? '2000px'
                  : closingTrailerId === trailer.id
                    ? '0'
                    : '0',
                opacity: closingTrailerId === trailer.id ? 0 : 1,
                transform: (editingTrailer?.id === trailer.id && closingTrailerId !== trailer.id) ? 'translateY(0)' : 'translateY(-20px)',
                pointerEvents: (editingTrailer?.id === trailer.id || closingTrailerId === trailer.id) ? 'auto' : 'none'
              }}
            >
              { (editingTrailer?.id === trailer.id || closingTrailerId === trailer.id) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Name</label>
                    <input
                      type="text"
                      value={editingTrailer ? editingTrailer.name : ''}
                      onChange={e => editingTrailer && setEditingTrailer({ ...editingTrailer, name: e.target.value })}
                      className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#ffa300]">Location</label>
                    <div className={`relative overflow-visible transition-all duration-300 ease-in-out ${showSuggestions ? 'z-50' : ''}`}>
                      <input
                        type="text"
                        value={editingTrailer ? editingTrailer.location : ''}
                        onChange={e => editingTrailer && setEditingTrailer({ ...editingTrailer, location: e.target.value })}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        className={`mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 ${showSuggestions ? 'border-[#ffa300]' : 'border-white'} bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300] transition-all duration-300`}
                        placeholder="Enter location or use current location"
                      />
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          const address = await handleUseMyLocation(true);
                          if (address && editingTrailer) setEditingTrailer({ ...editingTrailer, location: address });
                        }}
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
                                  if (editingTrailer) {
                                    setEditingTrailer({ ...editingTrailer, location: suggestion.description });
                                    handleSuggestionClick(suggestion.place_id);
                                    setShowSuggestions(false);
                                  }
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
                        value={editingTrailer ? editingTrailer.startTime : '09:00'}
                        onChange={e => editingTrailer && setEditingTrailer({ ...editingTrailer, startTime: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#ffa300]">End Time</label>
                      <input
                        type="time"
                        value={editingTrailer ? editingTrailer.endTime : '17:00'}
                        onChange={e => editingTrailer && setEditingTrailer({ ...editingTrailer, endTime: e.target.value })}
                        className="mt-1 block w-full h-9 text-[#ffa300] rounded-md border-2 border-white bg-[#1e1b1b] shadow-sm focus:border-[#ffa300] focus:ring-[#ffa300]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => {
                        editingTrailer && handleUpdateTrailer(editingTrailer);
                        closeEditForm();
                      }}
                      className="px-4 py-2 bg-[#3e2802] text-[#ffa300] rounded-md hover:bg-[#2a1c01] w-full sm:w-auto"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => closeEditForm()}
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
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
} 