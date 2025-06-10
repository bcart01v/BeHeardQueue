import { useState, useRef } from 'react';
import { Trailer } from '@/types/trailer';
import { Company } from '@/types/company';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { useTheme } from '@/app/context/ThemeContext';
import { getThemeColor, getUIColor, uiColors } from '@/app/colors';

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

  const { theme } = useTheme();

  return (
    <section className={`${getThemeColor(theme, 'cardBackground')} rounded-lg shadow p-4 md:p-6`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className={`text-2xl font-bold ${getThemeColor(theme, 'textHeader')}`}>Trailers</h2>
        <button
          onClick={() => setIsAddingTrailer(true)}
          className={`px-4 py-2 rounded-md w-full sm:w-auto ${getUIColor('button', 'secondary', theme)} ${getUIColor('hover', 'button', theme)}`}
        >
          Add Trailer
        </button>
      </div>

      {/* Company Selector for Trailers */}
      <div className="mb-6">
        <h3 className={`text-lg font-medium mb-2 ${getThemeColor(theme, 'textHeader')}`}>Filter by Company</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCurrentCompany(null)}
            className={`px-4 py-2 rounded-md transition-colors ${
              currentCompany === null
                ? getUIColor('button', 'secondary', theme)
                : `${getUIColor('button', 'primary', theme)} ${getUIColor('hover', 'button', theme)}`
            }`}
          >
            All Companies
          </button>
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => setCurrentCompany(company)}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentCompany?.id === company.id 
                  ? getUIColor('button', 'secondary', theme)
                  : `${getUIColor('button', 'primary', theme)} ${getUIColor('hover', 'button', theme)}`
              }`}
            >
              {company.name}
            </button>
          ))}
        </div>
      </div>

      <div 
        ref={addTrailerFormRef} 
       className={`mb-6 p-4 rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${getThemeColor(theme, 'cardBackground')} ${getThemeColor(theme, 'border')}`}
        style={{
          maxHeight: isAddingTrailer ? '2000px' : '0',
          opacity: isAddingTrailer ? '1' : '0',
          transform: isAddingTrailer ? 'translateY(0)' : 'translateY(-20px)',
          pointerEvents: isAddingTrailer ? 'auto' : 'none'
        }}
      >
        <h3 className={`text-lg font-semibold mb-4 ${getThemeColor(theme, 'textHeader')}`}>Add New Trailer</h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${getThemeColor(theme, 'textHeader')}`}>Company</label>
            <select
              value={currentCompany?.id || ''}
              onChange={(e) => {
                const selectedCompany = companies.find(c => c.id === e.target.value);
                if (selectedCompany) {
                  setCurrentCompany(selectedCompany);
                }
              }}
              className={`mt-1 block w-full h-9 rounded-md shadow-sm
                ${uiColors.form.input.background[theme]}
                ${uiColors.form.input.text[theme]}
                ${uiColors.form.input.border[theme]}
                focus:border-[#ffa300] focus:ring-[#ffa300]`}
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
              <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Name</label>
              <input
                type="text"
                value={newTrailer.name}
                onChange={(e) => setNewTrailer({ ...newTrailer, name: e.target.value })}
                className={`mt-1 block w-full h-9 rounded-md shadow-sm
                  ${uiColors.form.input.background[theme]}
                  ${uiColors.form.input.text[theme]}
                  ${uiColors.form.input.border[theme]}
                  focus:border-[#ffa300] focus:ring-[#ffa300]`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Location</label>
              <div className={`relative overflow-visible transition-all duration-300 ease-in-out ${showSuggestions ? 'z-50' : ''}`}>
                <input
                  type="text"
                  value={newTrailer.location}
                  onChange={(e) => {
                    setNewTrailer({ ...newTrailer, location: e.target.value });
                    handleAddressSearch(e.target.value);
                  }}
                  className={`mt-1 block w-full h-9 rounded-md shadow-sm
                    ${uiColors.form.input.background[theme]} 
                    ${uiColors.form.input.text[theme]} 
                    ${showSuggestions ? 'border-[#ffa300]' : uiColors.form.input.border[theme]}
                    focus:border-[#ffa300] focus:ring-[#ffa300] transition-all duration-300`}
                  placeholder="Enter location or use current location"
                />
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    const address = await handleUseMyLocation(false);
                    if (address) setNewTrailer(prev => ({ ...prev, location: address }));
                  }}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${getThemeColor(theme, 'textHeader')} hover:text-white`}
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
                    className={`mt-1 shadow-lg rounded-md ${getThemeColor(theme, 'cardBackground')} border-2 border-[#ffa300]`}
                  >
                    <div className="max-h-60 overflow-y-auto">
                      {locationSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.place_id}
                          className={`
                            px-4 py-2 cursor-pointer transition-colors duration-200
                            ${getThemeColor(theme, 'text')}
                            ${getUIColor('hover', 'background', theme)}
                          `}
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
              <label className={`block text-sm font-medium ${getThemeColor(theme, 'textHeader')}`}>Start Time</label>
              <input
                type="time"
                value={newTrailer.startTime || '09:00'}
                onChange={(e) => setNewTrailer({ ...newTrailer, startTime: e.target.value })}
                className={`mt-1 block w-full h-9 rounded-md shadow-sm
                  ${uiColors.form.input.text[theme]}
                  ${uiColors.form.input.border[theme]}
                  ${uiColors.form.input.background[theme]}
                  focus:border-[#ffa300] focus:ring-[#ffa300]`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${getThemeColor(theme, 'textHeader')}`}>End Time</label>
              <input
                type="time"
                value={newTrailer.endTime || '17:00'}
                onChange={(e) => setNewTrailer({ ...newTrailer, endTime: e.target.value })}
                className={`mt-1 block w-full h-9 rounded-md shadow-sm
                  ${uiColors.form.input.text[theme]}
                  ${uiColors.form.input.border[theme]}
                  ${uiColors.form.input.background[theme]}
                  focus:border-[#ffa300] focus:ring-[#ffa300]`}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => handleCreateTrailer(newTrailer as Omit<Trailer, 'id'>)}
              className={`px-4 py-2 w-full sm:w-auto rounded-md
                ${getUIColor('button', 'secondary', theme)}
                ${getUIColor('hover', 'button', theme)}`}
            >
              Save
            </button>
            <button
              onClick={() => setIsAddingTrailer(false)}
              className={`px-4 py-2 w-full sm:w-auto rounded-md
                ${getUIColor('button', 'primary', theme)}
                ${getUIColor('hover', 'button', theme)}`}
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
          <div key={trailer.id} className={`${getThemeColor(theme, 'surface')} ${getThemeColor(theme, 'border')} border rounded-lg p-4`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h3 className={`text-lg font-semibold ${getThemeColor(theme, 'textHeader')}`}>{trailer.name}</h3>
              <div className="flex space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => setEditingTrailer(trailer)}
                  className={`${getThemeColor(theme, 'text')} hover:underline flex-1 sm:flex-none`}
                >
                  Edit
                </button>
                <button
                  onClick={() => trailer.id && handleDeleteTrailer(trailer.id)}
                  className={`${getThemeColor(theme, 'text')} hover:underline flex-1 sm:flex-none`}
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
                    <label className={`block text-sm font-medium ${getThemeColor(theme, 'textHeader')}`}>Name</label>
                    <input
                      type="text"
                      value={editingTrailer ? editingTrailer.name : ''}
                      onChange={e => editingTrailer && setEditingTrailer({ ...editingTrailer, name: e.target.value })}
                      className={`mt-1 block w-full h-9 rounded-md shadow-sm
                        ${uiColors.form.input.text[theme]}
                        ${uiColors.form.input.border[theme]}
                        ${uiColors.form.input.background[theme]}
                        focus:border-[#ffa300] focus:ring-[#ffa300]`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${getThemeColor(theme, 'textHeader')}`}>Location</label>
                    <div className={`relative overflow-visible transition-all duration-300 ease-in-out ${showSuggestions ? 'z-50' : ''}`}>
                      <input
                        type="text"
                        value={editingTrailer ? editingTrailer.location : ''}
                        onChange={e => editingTrailer && setEditingTrailer({ ...editingTrailer, location: e.target.value })}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        className={`mt-1 block w-full h-9 rounded-md shadow-sm
                          ${uiColors.form.input.text[theme]}
                          ${uiColors.form.input.border[theme]}
                          ${uiColors.form.input.background[theme]}
                          focus:border-[#ffa300] focus:ring-[#ffa300] transition-all duration-300`}
                          placeholder="Enter location or use current location"
                      />
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          const address = await handleUseMyLocation(true);
                          if (address && editingTrailer) setEditingTrailer({ ...editingTrailer, location: address });
                        }}
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${getThemeColor(theme, 'text')} hover:${getThemeColor(theme, 'textHeader')}`}
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
                          className={`${getThemeColor(theme, 'cardBackground')} ${getThemeColor(theme, 'border')} border-2 border-white rounded-md shadow-lg`}
                        >
                          <div className="max-h-60 overflow-y-auto">
                            {locationSuggestions.map((suggestion) => (
                              <div
                                key={suggestion.place_id}
                                className={`px-4 py-2 cursor-pointer ${getThemeColor(theme, 'text')} ${getUIColor('hover', 'button', theme)}`}
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
                      <label className={`block text-sm font-medium ${getThemeColor(theme, 'textHeader')}`}>Start Time</label>
                      <input
                        type="time"
                        value={editingTrailer ? editingTrailer.startTime : '09:00'}
                        onChange={e => editingTrailer && setEditingTrailer({ ...editingTrailer, startTime: e.target.value })}
                        className={`mt-1 block w-full h-9 rounded-md shadow-sm
                          ${uiColors.form.input.text[theme]}
                          ${uiColors.form.input.border[theme]}
                          ${uiColors.form.input.background[theme]}
                          focus:border-[#ffa300] focus:ring-[#ffa300]`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${getThemeColor(theme, 'textHeader')}`}>End Time</label>
                      <input
                        type="time"
                        value={editingTrailer ? editingTrailer.endTime : '17:00'}
                        onChange={e => editingTrailer && setEditingTrailer({ ...editingTrailer, endTime: e.target.value })}
                        className={`mt-1 block w-full h-9 rounded-md shadow-sm
                          ${uiColors.form.input.text[theme]}
                          ${uiColors.form.input.border[theme]}
                          ${uiColors.form.input.background[theme]}
                          focus:border-[#ffa300] focus:ring-[#ffa300]`}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => {
                        editingTrailer && handleUpdateTrailer(editingTrailer);
                        closeEditForm();
                      }}
                      className={`px-4 py-2 w-full sm:w-auto rounded-md
                        ${getUIColor('button', 'secondary', theme)}
                        ${getUIColor('hover', 'button', theme)}`}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => closeEditForm()}
                      className={`px-4 py-2 w-full sm:w-auto rounded-md
                        ${getUIColor('button', 'primary', theme)}
                        ${getUIColor('hover', 'button', theme)}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            {(!editingTrailer || editingTrailer.id !== trailer.id) && (
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm ${getThemeColor(theme, 'text')}`}>
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