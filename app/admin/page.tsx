'use client';
// We can use Client for this page, it's not data intensive.


import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { CompanySettings } from '@/types/company';
import { Trailer } from '@/types/trailer';
import { Stall } from '@/types/stall';
import { ServiceType } from '@/types/trailer';
import { StallStatus } from '@/types/stall';


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
    stalls: []
  });
  const [newStall, setNewStall] = useState<Partial<Stall>>({
    name: '',
    status: 'available',
    trailerGroup: ''
  });
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchCompanySettings();
    fetchTrailers();
    fetchStalls();
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

  const handleCompanySettingsUpdate = async () => {
    const settingsRef = doc(db, 'companySettings', 'settings');
    await updateDoc(settingsRef, companySettings);
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
      stalls: []
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Company Settings Section */}
        <section className="bg-white rounded-lg shadow p-6">
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
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                value={companySettings.name}
                onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                disabled={!isEditingCompany}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Opening Time</label>
              <input
                type="time"
                value={companySettings.openTime}
                onChange={(e) => setCompanySettings({ ...companySettings, openTime: e.target.value })}
                disabled={!isEditingCompany}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Closing Time</label>
              <input
                type="time"
                value={companySettings.closeTime}
                onChange={(e) => setCompanySettings({ ...companySettings, closeTime: e.target.value })}
                disabled={!isEditingCompany}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Trailers Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Trailers</h2>
            <button
              onClick={() => setIsAddingTrailer(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Trailer
            </button>
          </div>

          {isAddingTrailer && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">Add New Trailer</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newTrailer.name}
                    onChange={(e) => setNewTrailer({ ...newTrailer, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Type</label>
                  <select
                    value={newTrailer.serviceType}
                    onChange={(e) => setNewTrailer({ ...newTrailer, serviceType: e.target.value as ServiceType })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="shower">Shower</option>
                    <option value="laundry">Laundry</option>
                    <option value="haircut">Haircut</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={newTrailer.startTime}
                    onChange={(e) => setNewTrailer({ ...newTrailer, startTime: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={newTrailer.endTime}
                    onChange={(e) => setNewTrailer({ ...newTrailer, endTime: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                  <input
                    type="number"
                    value={newTrailer.duration}
                    onChange={(e) => setNewTrailer({ ...newTrailer, duration: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buffer Time (minutes)</label>
                  <input
                    type="number"
                    value={newTrailer.bufferTime}
                    onChange={(e) => setNewTrailer({ ...newTrailer, bufferTime: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Slots Per Block</label>
                  <input
                    type="number"
                    value={newTrailer.slotsPerBlock}
                    onChange={(e) => setNewTrailer({ ...newTrailer, slotsPerBlock: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
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
          )}
          
          <div className="space-y-4">
            {trailers.map((trailer) => (
              <div key={trailer.id} className="border rounded-lg p-4">
                {editingTrailer?.id === trailer.id && editingTrailer ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        value={editingTrailer.name}
                        onChange={(e) => handleEditTrailerName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Service Type</label>
                      <select
                        value={editingTrailer.serviceType}
                        onChange={(e) => handleEditTrailerServiceType(e.target.value as ServiceType)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="shower">Shower</option>
                        <option value="laundry">Laundry</option>
                        <option value="haircut">Haircut</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Time</label>
                      <input
                        type="time"
                        value={editingTrailer.startTime}
                        onChange={(e) => handleEditTrailerTimes('startTime', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Time</label>
                      <input
                        type="time"
                        value={editingTrailer.endTime}
                        onChange={(e) => handleEditTrailerTimes('endTime', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                      <input
                        type="number"
                        value={editingTrailer.duration}
                        onChange={(e) => handleEditTrailerSettings('duration', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Buffer Time (minutes)</label>
                      <input
                        type="number"
                        value={editingTrailer.bufferTime}
                        onChange={(e) => handleEditTrailerSettings('bufferTime', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Slots Per Block</label>
                      <input
                        type="number"
                        value={editingTrailer.slotsPerBlock}
                        onChange={(e) => handleEditTrailerSettings('slotsPerBlock', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateTrailer(editingTrailer)}
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
                ) : (
                  <>
                    <h3 className="text-lg font-semibold">{trailer.name}</h3>
                    <p className="text-gray-600">Service Type: {trailer.serviceType}</p>
                    <p className="text-gray-600">Hours: {trailer.startTime} - {trailer.endTime}</p>
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
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Stalls</h2>
            <button
              onClick={() => setIsAddingStall(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Stall
            </button>
          </div>

          {isAddingStall && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">Add New Stall</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newStall.name}
                    onChange={(e) => setNewStall({ ...newStall, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trailer</label>
                  <select
                    value={newStall.trailerGroup}
                    onChange={(e) => setNewStall({ ...newStall, trailerGroup: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={newStall.status}
                    onChange={(e) => setNewStall({ ...newStall, status: e.target.value as StallStatus })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
          )}
          
          <div className="space-y-4">
            {trailers.map((trailer) => (
              <div key={trailer.id} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">{trailer.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stalls
                    .filter((stall) => stall.trailerGroup === trailer.id)
                    .map((stall) => (
                      <div key={stall.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        {editingStall?.id === stall.id && editingStall ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Name</label>
                              <input
                                type="text"
                                value={editingStall.name}
                                onChange={(e) => handleEditStallName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Status</label>
                              <select
                                value={editingStall.status}
                                onChange={(e) => handleEditStallStatus(e.target.value as StallStatus)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              >
                                <option value="available">Available</option>
                                <option value="in_use">In Use</option>
                                <option value="refreshing">Refreshing</option>
                                <option value="out_of_order">Out of Order</option>
                              </select>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleUpdateStall(editingStall)}
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
                        ) : (
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-lg">{stall.name}</p>
                              <p className={`text-sm mt-1 px-2 py-1 rounded-full inline-block ${
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
      </div>
    </div>
  );
} 