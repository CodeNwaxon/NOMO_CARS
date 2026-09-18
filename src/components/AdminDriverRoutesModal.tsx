"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, MapPin } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdminDriverRoutesModalProps {
  driverId: string;
  driverName: string;
  onClose: () => void;
}

export default function AdminDriverRoutesModal({ driverId, driverName, onClose }: AdminDriverRoutesModalProps) {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRoutes();
  }, [driverId]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      // 1. Fetch all routes for this driver
      const q = query(collection(db, "vehicleServices"), where("driverId", "==", driverId));
      const snap = await getDocs(q);
      const fetchedRoutes = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      
      // 2. Fetch all vehicles for this driver to map vehicle names
      const vq = query(collection(db, "vehicles"), where("driverId", "==", driverId));
      const vsnap = await getDocs(vq);
      const vMap: Record<string, string> = {};
      vsnap.forEach(doc => {
        const data = doc.data();
        vMap[doc.id] = `${data.details?.make || "Unknown"} ${data.details?.model || ""}`.trim();
      });

      setVehiclesMap(vMap);
      
      // Sort routes by vehicleId to group them visually
      fetchedRoutes.sort((a, b) => {
        if (a.vehicleId < b.vehicleId) return -1;
        if (a.vehicleId > b.vehicleId) return 1;
        return 0;
      });

      setRoutes(fetchedRoutes);
    } catch (error) {
      console.error("Error fetching driver routes:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-8 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-md md:rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-lg md:text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
              Routes for <br className="md:hidden" /> {driverName}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">
              All active routes associated with this driver's vehicles.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="md:p-6 p-4 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Routes Found</h3>
              <p className="text-gray-500 mt-1">This driver hasn't registered any routes yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map(route => (
                <div key={route.id} className="relative flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:-translate-y-1 transition-all shadow-sm hover:shadow-md">
                  
                  <div className="mb-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                      Vehicle: {vehiclesMap[route.vehicleId] || "Unknown Vehicle"}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-row items-center gap-1.5 font-bold text-base text-gray-900 dark:text-white">
                      <span className="text-brand-primary truncate max-w-[45%]">{route.startPoint}</span>
                      <span className="text-gray-400 text-xs">➔</span>
                      <span className="truncate max-w-[45%]">{route.destination}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="font-black bg-brand-secondary/10 text-brand-secondary px-2 py-0.5 rounded-md shadow-sm text-sm">₦{route.price}</span>
                    {route.isNegotiable ? (
                      <span className="text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Negotiable</span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Fixed Price</span>
                    )}
                  </div>

                  {route.description && (
                    <p className="text-xs mt-3 p-2.5 bg-blue-50 dark:bg-slate-800 text-blue-900 dark:text-slate-300 rounded-lg italic line-clamp-2 border border-blue-100 dark:border-slate-700">
                      "{route.description}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
