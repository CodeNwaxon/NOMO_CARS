"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/driver/login"); // Redirect to login if not authenticated
        return;
      }
      
      const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
      
      // Redirect if not the CEO (Admin)
      if (user.uid !== adminUid) {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Double check in render to prevent brief flashes of content if they aren't admin
  if (!user || user.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center dark:bg-gray-800 border dark:border-gray-700">
        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 dark:bg-blue-900/30">
          <ShieldCheck className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">
          Welcome CEO
        </h1>
        
        <p className="text-gray-500 mb-8 dark:text-gray-400">
          You have successfully logged into the admin dashboard. The admin features will be built out in the next phase.
        </p>
      </div>
    </div>
  );
}
