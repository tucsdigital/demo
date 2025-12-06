"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, onAuthStateChangedFirebase, logoutFirebase } from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedFirebase(async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      // Sincronizar usuario en system/users cuando se autentica
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          await fetch("/api/user/sync-system-user", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
        } catch (syncError) {
          // No fallar si la sincronización falla, solo loguear el error
          // console.error("Error sincronizando usuario en system:", syncError);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await logoutFirebase();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
