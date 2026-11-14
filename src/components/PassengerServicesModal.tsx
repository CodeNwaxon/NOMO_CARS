"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Loader2, MapPin, ChevronDown, ChevronUp, Edit3 } from "lucide-react";

import HireContactOverlay from "./HireContactOverlay";

interface PassengerServicesModalProps {
  vehicleId: string;
  vehicleName: string;
  driverId: string;
  isOwner?: boolean;
  onEditServices?: () => void;
  onClose: () => void;
}

export default function PassengerServicesModal({ vehicleId, vehicleName, driverId, isOwner = false, onEditServices, onClose }: PassengerServicesModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null);
  const [showContactOverlay, setShowContactOverlay] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "vehicleServices"), where("vehicleId", "==", vehicleId));
        const snapshot = await getDocs(q);
        const fetched: any[] = [];
        snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));

        setServices(fetched);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [vehicleId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm dark:bg-black/80" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 rounded-md md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Available Routes</h2>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">For: <span className="font-bold text-slate-800 dark:text-slate-100">{vehicleName}</span></p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => isOwner ? onEditServices?.() : setShowContactOverlay(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-lg transition-colors border border-brand-primary/50 whitespace-nowrap"
            >
              {isOwner && <Edit3 className="inline w-3 h-3 mr-1" />}
              {isOwner ? "Edit" : "Contact Driver"}
            </button>
            <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors border border-slate-200 dark:border-slate-600">
              <X className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>



        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white p-3 md:p-6 custom-scrollbar dark:bg-slate-800">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>
          ) : services.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 flex flex-col items-center">
              <MapPin className="w-16 h-16 mb-4 opacity-30" />
              <p className="font-medium text-lg text-slate-700 dark:text-slate-200">No routes listed</p>
              <p className="text-xs mt-2">This driver hasn't added specific routes for this vehicle yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={service.id} className="bg-white border border-slate-200 rounded-md md:rounded-xl p-3 md:p-5 shadow-sm hover:border-blue-300 hover:shadow-md dark:bg-slate-700 dark:border-slate-600 dark:hover:border-blue-500 transition-all relative overflow-hidden group">
                  {/* Subtle gradient accent */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-secondary to-brand-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>

                  <div className="pl-3">
                    <div className="flex flex-col gap-1 mb-3">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
                        <MapPin className="w-4 h-4" />
                        <span><span className="text-slate-500 dark:text-slate-400 font-normal mr-1">From:</span>{service.startPoint}</span>
                      </div>
                      <div className="w-0.5 h-3 bg-slate-200 dark:bg-slate-600 ml-2"></div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                        <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span><span className="text-slate-500 dark:text-slate-400 font-normal mr-1">To:</span>{service.destination}</span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 border-t border-slate-200 dark:border-slate-700 pt-4 gap-4 md:gap-0">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Price</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-900 dark:text-white">₦{service.price}</span>
                          {service.isNegotiable ? (
                            <span className="text-green-800 bg-green-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase border border-green-200 dark:text-green-300 dark:bg-green-900/40 dark:border-green-800">Negotiable</span>
                          ) : (
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase border border-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:border-slate-600">Fixed</span>
                          )}
                        </div>
                      </div>

                      {service.description && (
                        <button
                          onClick={() => setExpandedDesc(expandedDesc === service.id ? null : service.id)}
                          className="flex items-center justify-center gap-1 text-xs font-medium text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-2 md:py-1.5 rounded-lg transition-colors w-full md:w-auto"
                        >
                          Details {expandedDesc === service.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {service.description && expandedDesc === service.id && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 animate-in slide-in-from-top-2">
                        {service.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact Overlay */}
      {showContactOverlay && (
        <HireContactOverlay driverId={driverId} vehicleName={vehicleName} onClose={() => setShowContactOverlay(false)} />
      )}
    </div>
  );
}
