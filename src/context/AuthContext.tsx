"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

interface UserProfile {
  role: "driver" | "passenger" | "admin";
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  age?: string;
  identityNumber?: string;
  identityImage?: string;
  operatingCity?: string;
  operatingState?: string;
  isApproved?: boolean;
  username?: string;
  displayImage?: string;
  rating?: number;
  whatsappEnabled?: boolean;
  points?: number;
  vipStars?: number;
  vipExpiry?: string;
  ticketExpiry?: string;
  lastTicketPrice?: number;
  lastTicketDays?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  deleteAccount: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user document exists, if not, create a base one
      const docRef = doc(db, "users", result.user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        const newProfile: UserProfile = {
          role: "passenger", // Default role, they can upgrade to driver later
          username: result.user.displayName || "User",
          displayImage: result.user.photoURL || "",
          firstName: result.user.displayName || "",
          rating: 5.0,
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      } else {
        setProfile(docSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      const { deleteUser, reauthenticateWithPopup } = await import("firebase/auth");
      
      // 1. Re-authenticate to ensure recent login (required for deletion)
      try {
        await reauthenticateWithPopup(user, googleProvider);
      } catch (reauthError: any) {
        console.error("Reauthentication failed:", reauthError);
        throw new Error("reauth-failed");
      }

      // 2. Delete all Cloudinary images associated with the user
      const urlsToDelete: string[] = [];
      if (profile?.displayImage) urlsToDelete.push(profile.displayImage);
      if (profile?.identityImage) urlsToDelete.push(profile.identityImage);
      
      if (urlsToDelete.length > 0) {
        try {
          const { deleteImagesFromCloudinary } = await import("@/lib/cloudinary");
          await deleteImagesFromCloudinary(urlsToDelete);
        } catch (cloudinaryError) {
          console.error("Failed to delete Cloudinary images during account deletion:", cloudinaryError);
          // We continue with account deletion even if image deletion fails
        }
      }

      // 3. Delete user document from Firestore
      const docRef = doc(db, "users", user.uid);
      await deleteDoc(docRef);

      // 4. Delete the user from Firebase Auth
      await deleteUser(user);

      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
