"use client";

import { onAuthStateChanged } from "firebase/auth";
import { type ReactNode, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getUserDoc } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let firestoreDoc = null;

        try {
          firestoreDoc = await getUserDoc(firebaseUser.uid);
        } catch (error) {
          console.log("AuthProvider user doc fetch error:", error);
        }

        setUser({ ...firebaseUser, ...firestoreDoc });
        setLoading(false);
        return;
      }

      setUser(null);
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading]);

  return <>{children}</>;
}
