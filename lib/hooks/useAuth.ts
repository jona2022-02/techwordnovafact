// lib/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/types/auth';

export interface UseAuthResult {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      console.error('Error obteniendo perfil:', err);
      throw err;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        try {
          // Obtener el perfil completo del usuario
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setUser(userProfile);
          } else {
            // Si no existe perfil en Firestore, crear uno básico
            const basicProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName,
              role: 'client',
              permissions: ['home', 'mi-membresia'],
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isActive: true
            };
            setUser(basicProfile);
          }
        } catch (err) {
          console.error('Error obteniendo perfil de usuario:', err);
          setError('Error cargando datos del usuario');
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    firebaseUser,
    loading,
    error
  };
}