"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

interface UserProfile {
  role: "driver" | "passenger" | "admin";
  email?: string;
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
  isDisabled?: boolean;
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
  createdAt?: any;
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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userObj: User) => {
    try {
      const docRef = doc(db, "users", userObj.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        
        let needsUpdate = false;
        const updates: any = {};

        if (!data.email && userObj.email) {
          data.email = userObj.email;
          updates.email = userObj.email;
          needsUpdate = true;
        }

        // Handle VIP expiry logic
        if (data.vipExpiry && new Date(data.vipExpiry) < new Date() && (data.vipStars || 0) > 0) {
          // Reset stars and points in DB if expired
          updates.vipStars = 0;
          updates.points = 0;
          data.vipStars = 0;
          data.points = 0;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await setDoc(docRef, updates, { merge: true });
        }
      }
    } catch (error) {
      console.error("Error fetching profile initial checks:", error);
    }
  };

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
        
        profileUnsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
      } else {
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user document exists, if not, create a base one
      const docRef = doc(db, "users", result.user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Check for referral code
        const referralCode = localStorage.getItem("referralCode");

        const newProfile: UserProfile = {
          role: "passenger", // Default role, they can upgrade to driver later
          email: result.user.email || "",
          username: result.user.displayName || "User",
          displayImage: result.user.photoURL || "",
          firstName: result.user.displayName || "",
          rating: 5.0,
          ...(referralCode && referralCode !== result.user.uid ? { referredBy: referralCode } : {})
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);

        // Process referral on the backend securely
        if (referralCode && referralCode !== result.user.uid) {
          try {
            await fetch("/api/referral", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referrerId: referralCode }),
            });
          } catch (e) {
            console.error("Failed to process referral:", e);
          }
          localStorage.removeItem("referralCode");
        }

        // Send Welcome Message Notification
        try {
          const newNotif = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            title: "Welcome to Nomo Cars!",
            message: "Welcome aboard! We are thrilled to have you join our platform. Explore our services and let us know if you need any help.",
            date: Date.now(),
            isRead: false,
          };
          const stored = localStorage.getItem(`notifications_${result.user.uid}`);
          const existingNotifs = stored ? JSON.parse(stored) : [];
          localStorage.setItem(`notifications_${result.user.uid}`, JSON.stringify([newNotif, ...existingNotifs]));
        } catch (e) {
          console.error("Failed to inject welcome message", e);
        }

      } else {
        const existingData = docSnap.data() as UserProfile;
        if (!existingData.email && result.user.email) {
          existingData.email = result.user.email;
          await setDoc(docRef, { email: result.user.email }, { merge: true });
        }
        setProfile(existingData);
      }

      // Removed redirect logic

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
      
      // 3. Fetch all vehicles associated with the user to delete their images and documents
      const { collection, query, where, getDocs, deleteDoc } = await import("firebase/firestore");
      const q = query(collection(db, "vehicles"), where("driverId", "==", user.uid));
      const vehiclesSnapshot = await getDocs(q);
      
      const vehicleDocsToDelete: any[] = [];
      vehiclesSnapshot.forEach((docSnap) => {
        const vehicle = docSnap.data();
        vehicleDocsToDelete.push(docSnap.ref);
        
        if (vehicle.images) {
          Object.values(vehicle.images).forEach((url) => {
            if (typeof url === "string" && url.includes("cloudinary.com")) {
              urlsToDelete.push(url);
            }
          });
        }
        if (vehicle.documents) {
          Object.values(vehicle.documents).forEach((url) => {
            if (typeof url === "string" && url.includes("cloudinary.com")) {
              urlsToDelete.push(url);
            }
          });
        }
      });

      if (urlsToDelete.length > 0) {
        try {
          const { deleteImagesFromCloudinary } = await import("@/lib/cloudinary");
          await deleteImagesFromCloudinary(urlsToDelete);
        } catch (cloudinaryError) {
          console.error("Failed to delete Cloudinary images during account deletion:", cloudinaryError);
          // We continue with account deletion even if image deletion fails
        }
      }

      // 4. Delete vehicle documents from Firestore
      for (const vehicleRef of vehicleDocsToDelete) {
        await deleteDoc(vehicleRef);
      }

      // 5. Delete user document from Firestore
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
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
