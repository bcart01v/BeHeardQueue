import { useState, useRef } from 'react';
import { Company } from '@/types/company';
import CompanySignupLink from './CompanySignupLink';
import { useTheme } from '../../context/ThemeContext';
import { getThemeColor, getUIColor } from '../../colors';

interface CompanyManagementProps {
  companies: Company[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  handleCreateCompany: (company: Omit<Company, 'id'>) => Promise<void>;
  handleUpdateCompany: (company: Company) => Promise<void>;
  handleDeleteCompany: (companyId: string) => Promise<void>;
}

export default function CompanyManagement({
  companies,
  currentCompany,
  handleCreateCompany,
  handleUpdateCompany,
}: CompanyManagementProps) {
  const { theme } = useTheme();
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
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

  const addCompanyFormRef = useRef<HTMLDivElement>(null);
  const editCompanyFormRef = useRef<HTMLDivElement>(null);

  // Helper function to convert 24-hour time to 12-hour format
  const formatTimeTo12Hour = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <section className={`${getThemeColor(theme, 'primary')} rounded-lg shadow p-6`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${getThemeColor(theme, 'textHeader')}`}>Company Management</h2>
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
          <h3 className={`text-xl font-semibold ${getThemeColor(theme, 'textHeader')}`}>Companies</h3>
          <button
            onClick={() => setIsAddingCompany(true)}
            className={`${getUIColor('button', 'primary', theme)} px-4 py-2 rounded-md ${getUIColor('hover', 'button')}`}
          >
            Add Company
          </button>
        </div>

        {/* Add Company Form */}
        <div 
          ref={addCompanyFormRef}
          className={`mb-6 p-4 border-2 ${getUIColor('form', 'input', theme, 'border')} rounded-lg ${getUIColor('form', 'input', theme, 'background')} overflow-hidden transition-all duration-300 ease-in-out`}
          style={{
            maxHeight: isAddingCompany ? '2000px' : '0',
            opacity: isAddingCompany ? '1' : '0',
            transform: isAddingCompany ? 'translateY(0)' : 'translateY(-20px)',
            pointerEvents: isAddingCompany ? 'auto' : 'none'
          }}
        >
          <h3 className={`text-lg font-semibold ${getThemeColor(theme, 'text')} mb-4`}>Add New Company</h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Company Name</label>
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className={`mt-1 block w-full h-9 rounded-md border-2 px-3 
                  ${getUIColor('form', 'input', theme, 'background')} 
                  ${getUIColor('form', 'input', theme, 'text')} 
                  ${getUIColor('form', 'input', theme, 'border')}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Description</label>
              <textarea
                value={newCompany.description}
                onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                className={`mt-1 block w-full h-9 rounded-md border-2 px-3 
                  ${getUIColor('form', 'input', theme, 'background')} 
                  ${getUIColor('form', 'input', theme, 'text')} 
                  ${getUIColor('form', 'input', theme, 'border')}`}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Opening Time</label>
                <input
                  type="time"
                  value={newCompany.openTime}
                  onChange={(e) => setNewCompany({ ...newCompany, openTime: e.target.value })}
                  className={`mt-1 block w-full h-9 rounded-md border-2 px-3 
                    ${getUIColor('form', 'input', theme, 'background')} 
                    ${getUIColor('form', 'input', theme, 'text')} 
                    ${getUIColor('form', 'input', theme, 'border')}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Closing Time</label>
                <input
                  type="time"
                  value={newCompany.closeTime}
                  onChange={(e) => setNewCompany({ ...newCompany, closeTime: e.target.value })}
                  className={`mt-1 block w-full h-9 rounded-md border-2 px-3 
                    ${getUIColor('form', 'input', theme, 'background')} 
                    ${getUIColor('form', 'input', theme, 'text')} 
                    ${getUIColor('form', 'input', theme, 'border')}`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')} mb-2`}>Open Days</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                      className={`rounded border-2 px-2 
                        ${getUIColor('form', 'input', theme, 'border')} 
                        ${getUIColor('form', 'input', theme, 'background')} 
                        ${getUIColor('form', 'input', theme, 'text')}`}
                    />
                    <span className={`text-sm ${getThemeColor(theme, 'text')} capitalize`}>{day}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => setIsAddingCompany(false)}
                className={`${getUIColor('button', 'secondary', theme)} px-4 py-2 rounded-md ${getUIColor('hover', 'button')} w-full sm:w-auto`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateCompany(newCompany)}
                className={`${getUIColor('button', 'primary', theme)} px-4 py-2 rounded-md ${getUIColor('hover', 'button')} w-full sm:w-auto`}
              >
                Add Company
              </button>
            </div>
          </div>
        </div>

        {/* Companies Table */}
        <div className={`${getThemeColor(theme, 'surface')} rounded-lg shadow overflow-hidden border ${getUIColor('form', 'input', theme, 'border')} overflow-x-auto`}>
          {/* Desktop Table View - Hidden on Mobile */}
          <div className="hidden md:block">
            <table className={`min-w-full divide-y ${getUIColor('table', 'divider', theme)}`}>
              <thead className={`${getUIColor('table', 'header', theme)}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getThemeColor(theme, 'text')} uppercase tracking-wider`}>Name</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getThemeColor(theme, 'text')} uppercase tracking-wider hidden sm:table-cell`}>Description</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getThemeColor(theme, 'text')} uppercase tracking-wider hidden md:table-cell`}>Hours</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getThemeColor(theme, 'text')} uppercase tracking-wider hidden lg:table-cell`}>Open Days</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${getThemeColor(theme, 'text')} uppercase tracking-wider`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`${getThemeColor(theme, 'surface')} divide-y ${getUIColor('table', 'divider', theme)}`}>
                {companies.map((company) => (
                  editingCompany?.id === company.id ? (
                    <tr key={company.id + '-edit'}>
                      <td colSpan={5} className={`${getThemeColor(theme, 'surface')} px-6 py-6`}>
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            handleUpdateCompany(editingCompany);
                            setEditingCompany(null);
                          }}
                        >
                          <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="flex-1 flex flex-col">
                              <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Company Name</label>
                              <input
                                type="text"
                                value={editingCompany.name}
                                onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })}
                                className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                  ${getUIColor('form', 'input', theme, 'background')} 
                                  ${getUIColor('form', 'input', theme, 'text')} 
                                  ${getUIColor('form', 'input', theme, 'border')}`}
                                required
                              />
                            </div>
                            <div className="flex-1 flex flex-col">
                              <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Description</label>
                              <input
                                type="text"
                                value={editingCompany.description}
                                onChange={e => setEditingCompany({ ...editingCompany, description: e.target.value })}
                                className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                  ${getUIColor('form', 'input', theme, 'background')} 
                                  ${getUIColor('form', 'input', theme, 'text')} 
                                  ${getUIColor('form', 'input', theme, 'border')}`}
                                required
                              />
                            </div>
                            <div className="flex-1 flex flex-col">
                              <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Opening Time</label>
                              <input
                                type="time"
                                value={editingCompany.openTime}
                                onChange={e => setEditingCompany({ ...editingCompany, openTime: e.target.value })}
                                className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                  ${getUIColor('form', 'input', theme, 'background')} 
                                  ${getUIColor('form', 'input', theme, 'text')} 
                                  ${getUIColor('form', 'input', theme, 'border')}`}
                                required
                              />
                            </div>
                            <div className="flex-1 flex flex-col">
                              <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Closing Time</label>
                              <input
                                type="time"
                                value={editingCompany.closeTime}
                                onChange={e => setEditingCompany({ ...editingCompany, closeTime: e.target.value })}
                                className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                  ${getUIColor('form', 'input', theme, 'background')} 
                                  ${getUIColor('form', 'input', theme, 'text')} 
                                  ${getUIColor('form', 'input', theme, 'border')}`}
                                required
                              />
                            </div>
                          </div>
                          <div className="flex flex-col mt-4">
                            <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Open Days</label>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(editingCompany.openDays).map(([day, isOpen]) => (
                                <label key={day} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={isOpen}
                                    onChange={e => setEditingCompany({
                                      ...editingCompany,
                                      openDays: {
                                        ...editingCompany.openDays,
                                        [day]: e.target.checked
                                      }
                                    })}
                                    className={`rounded border-2 px-2 
                                      ${getUIColor('form', 'input', theme, 'border')} 
                                      ${getUIColor('form', 'input', theme, 'background')} 
                                      ${getUIColor('form', 'input', theme, 'text')}`}
                                  />
                                  <span className={`text-xs ${getThemeColor(theme, 'text')} capitalize`}>{day}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-row gap-2 justify-end">
                            <button
                              type="submit"
                              className={`px-4 py-2 ${getUIColor('button', 'primary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCompany(null)}
                              className={`px-4 py-2 ${getUIColor('button', 'secondary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr 
                      key={company.id}
                      className={`${editingCompany?.id === company.id ? getThemeColor(theme, 'secondary') : ''}`}
                      style={{ height: '64px' }}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap ${getThemeColor(theme, 'text')}`}>{company.name}</td>
                      <td className={`px-6 py-4 whitespace-nowrap ${getThemeColor(theme, 'text')} hidden sm:table-cell`}>{company.description}</td>
                      <td className={`px-6 py-4 whitespace-nowrap ${getThemeColor(theme, 'text')} hidden md:table-cell`}>{formatTimeTo12Hour(company.openTime)} - {formatTimeTo12Hour(company.closeTime)}</td>
                      <td className={`px-6 py-4 ${getThemeColor(theme, 'text')} hidden lg:table-cell`}>
                        <div className="max-h-12 overflow-y-auto">
                          {Object.entries(company.openDays)
                            .filter(([_, isOpen]) => isOpen)
                            .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
                            .join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setEditingCompany(company)}
                          className={`${getThemeColor(theme, 'text')} hover:underline`}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - Hidden on Desktop */}
          <div className="md:hidden">
            <div className="p-4">
              {companies.map((company) => (
                editingCompany?.id === company.id ? (
                  <div key={company.id + '-edit'} className={`mb-4 p-4 rounded-lg border ${getUIColor('form', 'input', theme, 'border')} ${getThemeColor(theme, 'surface')}`}>
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleUpdateCompany(editingCompany);
                        setEditingCompany(null);
                      }}
                    >
                      <div className="mb-4">
                        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Company Name</label>
                        <input
                          type="text"
                          value={editingCompany.name}
                          onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })}
                          className={`mt-1 block w-full h-9 rounded-md border-2 px-3 
                            ${getUIColor('form', 'input', theme, 'background')} 
                            ${getUIColor('form', 'input', theme, 'text')} 
                            ${getUIColor('form', 'input', theme, 'border')}`}
                          required
                        />
                      </div>
                      <div className="mb-4">
                        <label className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>Description</label>
                        <input
                          type="text"
                          value={editingCompany.description}
                          onChange={e => setEditingCompany({ ...editingCompany, description: e.target.value })}
                          className={`mt-1 block w-full h-9 rounded-md border-2 px-3 
                            ${getUIColor('form', 'input', theme, 'background')} 
                            ${getUIColor('form', 'input', theme, 'text')} 
                            ${getUIColor('form', 'input', theme, 'border')}`}
                          required
                        />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Opening Time</label>
                        <input
                          type="time"
                          value={editingCompany.openTime}
                          onChange={e => setEditingCompany({ ...editingCompany, openTime: e.target.value })}
                          className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                            ${getUIColor('form', 'input', theme, 'background')} 
                            ${getUIColor('form', 'input', theme, 'text')} 
                            ${getUIColor('form', 'input', theme, 'border')}`}
                          required
                        />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Closing Time</label>
                        <input
                          type="time"
                          value={editingCompany.closeTime}
                          onChange={e => setEditingCompany({ ...editingCompany, closeTime: e.target.value })}
                          className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                            ${getUIColor('form', 'input', theme, 'background')} 
                            ${getUIColor('form', 'input', theme, 'text')} 
                            ${getUIColor('form', 'input', theme, 'border')}`}
                          required
                        />
                      </div>
                      <div className="flex flex-col mt-4">
                        <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Open Days</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(editingCompany.openDays).map(([day, isOpen]) => (
                            <label key={day} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isOpen}
                                onChange={e => setEditingCompany({
                                  ...editingCompany,
                                  openDays: {
                                    ...editingCompany.openDays,
                                    [day]: e.target.checked
                                  }
                                })}
                                className={`rounded border-2 px-2 
                                  ${getUIColor('form', 'input', theme, 'border')} 
                                  ${getUIColor('form', 'input', theme, 'background')} 
                                  ${getUIColor('form', 'input', theme, 'text')}`}
                              />
                              <span className={`text-xs ${getThemeColor(theme, 'text')} capitalize`}>{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-row gap-2 justify-end">
                        <button
                          type="submit"
                          className={`px-4 py-2 ${getUIColor('button', 'primary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCompany(null)}
                          className={`px-4 py-2 ${getUIColor('button', 'secondary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div 
                    key={company.id}
                    className={`mb-4 p-4 rounded-lg border ${getUIColor('form', 'input', theme, 'border')} ${editingCompany?.id === company.id ? getThemeColor(theme, 'secondary') : getThemeColor(theme, 'surface')}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`text-lg font-medium ${getThemeColor(theme, 'text')}`}>{company.name}</h3>
                      <button
                        onClick={() => setEditingCompany(company)}
                        className={`${getThemeColor(theme, 'text')} hover:underline`}
                      >
                        Edit
                      </button>
                    </div>
                    <div className={`text-sm ${getThemeColor(theme, 'text')} opacity-80 mb-2`}>{company.description}</div>
                    <div className={`text-sm ${getThemeColor(theme, 'text')} opacity-80 mb-2`}>
                      {formatTimeTo12Hour(company.openTime)} - {formatTimeTo12Hour(company.closeTime)}
                    </div>
                    <div className={`text-sm ${getThemeColor(theme, 'text')} opacity-80 mb-2`}>
                      <span className="font-medium">Open Days:</span> {
                        Object.entries(company.openDays)
                          .filter(([_, isOpen]) => isOpen)
                          .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
                          .join(', ')
                      }
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 