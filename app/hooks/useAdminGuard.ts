'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthContext';

export function useAdminGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'admin') {
        router.replace('/unauthorized');
      }
    }
  }, [loading, user, router]);

  return {
    authorized: user?.role === 'admin',
    loading,
    user,
  };
}
