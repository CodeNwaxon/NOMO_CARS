"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, Car, ShieldAlert } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ImageViewerOverlay from "./ImageViewerOverlay";

interface DriverVehiclesModalProps {
  driverId: string;
  driverName: string;
  onClose: () => void;
}

export default function DriverVehiclesModal({ driverId, driverName, onClose }: DriverVehiclesModalProps) {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Image Viewer State for viewing a specific vehicle's images
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
    singleMode: boolean;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
    singleMode: false
  });

  useEffect(() => {
    fetchDriverVehicles();
  }, [driverId]);

  const fetchDriverVehicles = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "vehicles"), where("driverId", "==", driverId));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVehicles(fetched);
    } catch (error) {
      console.error("Error fetching driver vehicles:", error);
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
              Vehicles for <br className="md:hidden" /> {driverName}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">
              All vehicles registered to this driver.
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
          ) : vehicles.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Car className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Vehicles Found</h3>
              <p className="text-gray-500 mt-1">This driver hasn't registered any vehicles yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map(vehicle => (
                <div key={vehicle.id} className="bg-white dark:bg-gray-800 rounded-2xl p-1 md:p-2 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative overflow-hidden group">
                  <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden mb-3 relative">
                    {vehicle.images && Object.values(vehicle.images).length > 0 ? (
                      <>
                        <img src={Object.values(vehicle.images)[0] as string} alt="Vehicle" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => {
                              const allImages = [
                                ...(vehicle.images ? Object.values(vehicle.images) as string[] : []),
                                ...(vehicle.documents ? Object.values(vehicle.documents) as string[] : [])
                              ];
                              setViewerState({
                                isOpen: true,
                                images: allImages,
                                initialIndex: 0,
                                singleMode: false
                              });
                            }}
                            className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-white/20 hover:bg-brand-primary text-white backdrop-blur-md rounded-full font-semibold transition-colors shadow-sm"
                          >
                            View Images & Docs
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      {vehicle.isApproved ? (
                        <div className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">APPROVED</div>
                      ) : (
                        <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">PENDING</div>
                      )}
                    </div>
                  </div>

                  <div className="px-2 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                        {vehicle.details?.make || "Unknown"} {vehicle.details?.model || ""}
                      </h3>
                      <p className="text-[10px] text-gray-500 truncate">{vehicle.details?.year || "Unknown Year"}</p>
                      <p className="text-[10px] font-semibold text-brand-primary mt-0.5 uppercase tracking-wider">{vehicle.details?.plateNumber || "No Plate"}</p>
                    </div>

                    <div className="space-y-1 my-3 text-xs text-gray-600 dark:text-gray-400 flex-1">
                      <p><strong>Category:</strong> {vehicle.category || "N/A"}</p>
                      {vehicle.documents && Object.values(vehicle.documents).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.entries(vehicle.documents).map(([key, url]) => (
                            <button
                              key={key}
                              onClick={() => {
                                setViewerState({
                                  isOpen: true,
                                  images: [url as string],
                                  initialIndex: 0,
                                  singleMode: true
                                });
                              }}
                              className="text-brand-primary text-[10px] hover:bg-brand-primary/20 bg-brand-primary/10 px-1.5 py-0.5 rounded capitalize transition-colors"
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-red-500 mt-1">No documents uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ImageViewer Overlay */}
      {viewerState.isOpen && (
        <ImageViewerOverlay
          images={viewerState.images}
          initialIndex={viewerState.initialIndex}
          singleMode={viewerState.singleMode}
          onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
