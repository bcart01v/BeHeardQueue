'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types/user';
import { onUserAuthStateChanged } from '@/lib/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up authentication state listener
    const unsubscribe = onUserAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get the user's data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Convert Firestore timestamps to Date objects
            const user: User = {
              id: userDoc.id,
              email: userData.email || firebaseUser.email || '',
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              role: userData.role || 'user',
              companyId: userData.companyId || '',
              profilePhoto: userData.profilePhoto || '',
              phone: userData.phone || '',
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
              displayName: userData.displayName || firebaseUser.displayName || undefined,
              completedIntake: userData.completedIntake ?? false
            };
            
            setUser(user);
          } else {
            // If no Firestore document exists, create a basic user object
            const userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: firebaseUser.displayName?.split(' ')[0] || '',
              lastName: firebaseUser.displayName?.split(' ')[1] || '',
              role: 'user',
              companyId: '',
              createdAt: new Date(),
              updatedAt: new Date(),
              completedIntake: false
            };
            
            setUser(userData as User);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Clean up the subscription when the component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 