// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';

interface GoogleAuthState {
  isGoogleAuthenticated: boolean;
  googleUser: User | null;
  googleSignIn: () => Promise<void>;
  googleSignOut: () => Promise<void>;
  loading: boolean;
}

const GoogleAuthContext = createContext<GoogleAuthState>({
  isGoogleAuthenticated: false,
  googleUser: null,
  googleSignIn: async () => {},
  googleSignOut: async () => {},
  loading: true,
});

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setGoogleUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const googleSignIn = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const googleSignOut = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <GoogleAuthContext.Provider
      value={{
        isGoogleAuthenticated: !!googleUser,
        googleUser,
        googleSignIn,
        googleSignOut,
        loading,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = () => useContext(GoogleAuthContext);
