const getStatusColor = (status: string) => {
  // Normalize status by replacing underscores with hyphens
  const normalizedStatus = status.replace(/_/g, '-');
  
  switch (normalizedStatus) {
    case 'in-use':
      return 'bg-yellow-500 text-white';
    case 'out-of-order':
      return 'bg-red-500 text-white';
    case 'needs-cleaning':
      return 'bg-orange-500 text-white';
    case 'available':
      return 'bg-green-500 text-white';
    case 'scheduled':
      return 'bg-blue-500 text-white';
    case 'checked-in':
      return 'bg-purple-500 text-white';
    case 'in-progress':
      return 'bg-yellow-500 text-white';
    case 'completed':
      return 'bg-green-500 text-white';
    case 'cancelled':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}; 