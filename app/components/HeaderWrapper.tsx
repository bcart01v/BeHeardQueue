'use client';

import { useAuth } from './AuthContext';
import FloatingHeader from './FloatingHeader';
import AdminHeader from './AdminHeader';

export default function HeaderWrapper() {
  const { user, loading } = useAuth();

  // Show loading state or no header while authentication is being checked
  if (loading) {
    return null;
  }

  // If user is logged in, show the appropriate header based on role
  if (user) {
    return user.role === 'admin' ? <AdminHeader /> : <FloatingHeader />;
  }

  // If no user is logged in, show the client header with login/register options
  return <FloatingHeader />;
} 