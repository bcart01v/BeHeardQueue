import { useState } from 'react';
import { User } from '@/types/user';
import { Company } from '@/types/company';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { getThemeColor, getStatusColor, getUIColor } from '../../colors';

interface UsersProps {
  users: User[];
  companies: Company[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  handleCreateUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<void>;
  handleUpdateUser: (user: User) => Promise<void>;
  handleDeleteUser: (userId: string) => Promise<void>;
}

export default function Users({
  users,
  companies,
  currentCompany,
  setCurrentCompany,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser
}: UsersProps) {
  const { theme } = useTheme();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User> & { password?: string }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyId: currentCompany?.id || '',
    role: 'user',
    password: '',
    profilePhoto: ''
  });

  // Helper to get company name
  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Unknown Company';
  };

  // Helper to get role badge color
  const getRoleBadgeColor = (role: string) => {
    return getStatusColor('role', role);
  };

  // Handle profile photo upload
  const handleProfilePhotoUpload = async (file: File, isNewUser: boolean = true) => {
    try {
      console.log('Starting profile photo upload...');
      if (!file) {
        throw new Error('No file selected');
      }

      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to upload photos');
      }

      const storageRef = ref(storage, `profile-photos/${Date.now()}_${file.name}`);
      console.log('Uploading to storage path:', storageRef.fullPath);
      
      const uploadResult = await uploadBytes(storageRef, file);
      console.log('Upload successful:', uploadResult);
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', downloadURL);
      
      if (isNewUser) {
        setNewUser(prev => ({ ...prev, profilePhoto: downloadURL }));
      } else if (editingUser) {
        setEditingUser(prev => ({ ...prev!, profilePhoto: downloadURL }));
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert(`Failed to upload profile photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <section className={`${getThemeColor(theme, 'primary')} rounded-lg shadow p-4 md:p-6`}>
      {/* Filter by Company */}
      <div className="mb-6">
        <h3 className={`text-lg font-medium ${getThemeColor(theme, 'text')} mb-2`}>Filter by Company</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCurrentCompany(null)}
            className={`px-4 py-2 rounded-md ${
              currentCompany === null
                ? getUIColor('button', 'primary', theme)
                : getUIColor('button', 'secondary', theme)
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
                  ? getUIColor('button', 'primary', theme)
                  : getUIColor('button', 'secondary', theme)
              }`}
            >
              {company.name}
            </button>
          ))}
        </div>
      </div>

      {/* Add User Button and Form */}
      <div className="mb-4">
        {!isAddingUser && (
          <button
            onClick={() => setIsAddingUser(true)}
            className={`px-4 py-2 ${getUIColor('button', 'primary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
          >
            Add User
          </button>
        )}
        {isAddingUser && (
          <form
            className={`${getThemeColor(theme, 'surface')} p-4 rounded-lg mb-4`}
            onSubmit={async e => {
              e.preventDefault();
              try {
                await handleCreateUser(newUser as Omit<User, 'id'>);
                setIsAddingUser(false);
                setNewUser({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  companyId: currentCompany?.id || '',
                  role: 'user',
                  profilePhoto: ''
                });
              } catch (error: any) {
                if (error.code === 'auth/email-already-in-use') {
                  alert('This email address is already registered in the system. Please use a different email address.');
                } else {
                  alert('An error occurred while creating the user. Please try again.');
                }
                console.error('Error creating user:', error);
              }
            }}
          >
            {/* Profile Photo Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 flex flex-col items-center">
                <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Profile Photo</label>
                <div className="flex items-center gap-4">
                  {newUser.profilePhoto ? (
                    <img src={newUser.profilePhoto} alt="Profile" className={`w-20 h-20 rounded-full object-cover border-2 ${getUIColor('form', 'input', theme)}`} />
                  ) : (
                    <UserCircleIcon className={`w-20 h-20 ${getUIColor('form', 'input', theme)} rounded-full`} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleProfilePhotoUpload(file, true);
                    }}
                    className="hidden"
                    id="new-user-photo"
                  />
                  <label
                    htmlFor="new-user-photo"
                    className={`px-4 py-2 ${getUIColor('form', 'input', theme)} rounded-md ${getUIColor('form', 'hover')}`}
                  >
                    Upload Photo
                  </label>
                </div>
              </div>
            </div>

            {/* Row 1 */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 flex flex-col">
                <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>First Name</label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                  className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                    ${getUIColor('form', 'input', theme, 'background')} 
                    ${getUIColor('form', 'input', theme, 'text')} 
                    ${getUIColor('form', 'input', theme, 'border')}`}
                  required
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Last Name</label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                  className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                    ${getUIColor('form', 'input', theme, 'background')} 
                    ${getUIColor('form', 'input', theme, 'text')} 
                    ${getUIColor('form', 'input', theme, 'border')}`}
                  required
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                    ${getUIColor('form', 'input', theme, 'background')} 
                    ${getUIColor('form', 'input', theme, 'text')} 
                    ${getUIColor('form', 'input', theme, 'border')}`}
                  required
                />
              </div>
            </div>
            {/* Row 2 */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 flex flex-col">
                <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' | 'software-owner' })}
                  className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                    ${getUIColor('form', 'input', theme, 'background')} 
                    ${getUIColor('form', 'input', theme, 'text')} 
                    ${getUIColor('form', 'input', theme, 'border')}`}
                  required
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="software-owner">Software Owner</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col">
                <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Company</label>
                <select
                  value={newUser.companyId}
                  onChange={e => setNewUser({ ...newUser, companyId: e.target.value })}
                  className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                    ${getUIColor('form', 'input', theme, 'background')} 
                    ${getUIColor('form', 'input', theme, 'text')} 
                    ${getUIColor('form', 'input', theme, 'border')}`}
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Row 3 */}
            <div className="flex flex-row gap-2 justify-end">
              <button
                type="submit"
                className={`px-4 py-2 ${getUIColor('button', 'primary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className={`px-4 py-2 ${getUIColor('button', 'secondary', theme)} rounded-md ${getUIColor('button', 'hover')}`}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Table Display */}
      <div className="overflow-x-auto rounded-lg">
        <table className={`min-w-full divide-y ${getUIColor('table', 'divider', theme)} ${getThemeColor(theme, 'background')} rounded-lg`}>
          <thead>
            <tr className={getUIColor('table', 'header', theme)}>
              <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${getThemeColor(theme, 'text')}`}>Name</th>
              <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${getThemeColor(theme, 'text')}`}>Email</th>
              <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${getThemeColor(theme, 'text')}`}>Role</th>
              <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${getThemeColor(theme, 'text')}`}>Company</th>
              <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${getThemeColor(theme, 'text')}`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${getUIColor('table', 'divider', theme)}`}>
            {users
              .filter(user => currentCompany ? user.companyId === currentCompany.id : true)
              .map(user => [
                <tr key={user.id} className={`${getUIColor('table', 'row', theme)} ${getUIColor('hover', 'table')}`}>
                  <td className={`px-6 py-4 whitespace-nowrap ${getThemeColor(theme, 'text')}`}>
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt={user.firstName + ' ' + user.lastName} className={`w-10 h-10 rounded-full object-cover border-2 ${getUIColor('table', 'row', theme)}`} />
                    ) : (
                      <UserCircleIcon className={`w-10 h-10 ${getUIColor('table', 'row', theme)} rounded-full`} />
                    )}
                    <span className={`${getThemeColor(theme, 'text')} font-semibold`}>{user.firstName} {user.lastName}</span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${getThemeColor(theme, 'text')}`}>{user.email}</td>
                  <td className={`px-6 py-4 whitespace-nowrap ${getThemeColor(theme, 'text')}`}>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${getThemeColor(theme, 'text')}`}>{getCompanyName(user.companyId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setEditingUser(user)}
                      className={`${getThemeColor(theme, 'text')} hover:underline`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>,
                editingUser?.id === user.id && (
                  <tr key={user.id + '-edit'}>
                    <td colSpan={5} className={`${getThemeColor(theme, 'surface')} px-6 py-6`}>
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          handleUpdateUser(editingUser);
                          setEditingUser(null);
                        }}
                      >
                        {/* Profile Photo Row */}
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                          <div className="flex-1 flex flex-col items-center">
                            <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Profile Photo</label>
                            <div className="flex items-center gap-4">
                              {editingUser.profilePhoto ? (
                                <img src={editingUser.profilePhoto} alt="Profile" className={`w-20 h-20 rounded-full object-cover border-2 ${getUIColor('form', 'input', theme)}`} />
                              ) : (
                                <UserCircleIcon className={`w-20 h-20 ${getUIColor('form', 'input', theme)} rounded-full`} />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleProfilePhotoUpload(file, false);
                                }}
                                className="hidden"
                                id="edit-user-photo"
                              />
                              <label
                                htmlFor="edit-user-photo"
                                className={`px-4 py-2 ${getUIColor('form', 'input', theme)} rounded-md ${getUIColor('form', 'hover')}`}
                              >
                                Upload Photo
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Row 1 */}
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                          <div className="flex-1 flex flex-col">
                            <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>First Name</label>
                            <input
                              type="text"
                              value={editingUser.firstName}
                              onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })}
                              className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                ${getUIColor('form', 'input', theme, 'background')} 
                                ${getUIColor('form', 'input', theme, 'text')} 
                                ${getUIColor('form', 'input', theme, 'border')}`}
                              required
                            />
                          </div>
                          <div className="flex-1 flex flex-col">
                            <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Last Name</label>
                            <input
                              type="text"
                              value={editingUser.lastName}
                              onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })}
                              className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                ${getUIColor('form', 'input', theme, 'background')} 
                                ${getUIColor('form', 'input', theme, 'text')} 
                                ${getUIColor('form', 'input', theme, 'border')}`}
                              required
                            />
                          </div>
                          <div className="flex-1 flex flex-col">
                            <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Email</label>
                            <input
                              type="email"
                              value={editingUser.email}
                              onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                              className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                ${getUIColor('form', 'input', theme, 'background')} 
                                ${getUIColor('form', 'input', theme, 'text')} 
                                ${getUIColor('form', 'input', theme, 'border')}`}
                              required
                            />
                          </div>
                        </div>
                        {/* Row 2 */}
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                          <div className="flex-1 flex flex-col">
                            <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Role</label>
                            <select
                              value={editingUser.role}
                              onChange={e => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'user' | 'software-owner' })}
                              className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                ${getUIColor('form', 'input', theme, 'background')} 
                                ${getUIColor('form', 'input', theme, 'text')} 
                                ${getUIColor('form', 'input', theme, 'border')}`}
                              required
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="software-owner">Software Owner</option>
                            </select>
                          </div>
                          <div className="flex-1 flex flex-col">
                            <label className={`text-xs font-semibold ${getThemeColor(theme, 'text')} mb-1`}>Company</label>
                            <select
                              value={editingUser.companyId}
                              onChange={e => setEditingUser({ ...editingUser, companyId: e.target.value })}
                              className={`h-9 rounded-md px-3 w-full min-w-[200px] 
                                ${getUIColor('form', 'input', theme, 'background')} 
                                ${getUIColor('form', 'input', theme, 'text')} 
                                ${getUIColor('form', 'input', theme, 'border')}`}
                              required
                            >
                              {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {/* Row 3 */}
                        <div className="flex flex-row gap-2 justify-end">
                          <button
                            type="submit"
                            className={`px-4 py-2 ${getUIColor('button', 'primary', theme)} rounded-md ${getUIColor('hover', 'button')}`}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className={`px-4 py-2 ${getUIColor('button', 'secondary', theme)} rounded-md ${getUIColor('button', 'hover')}`}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )
              ]).flat()}
          </tbody>
        </table>
      </div>
    </section>
  );
} 