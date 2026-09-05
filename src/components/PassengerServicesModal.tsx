"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Loader2, MapPin, ChevronDown, ChevronUp } from "lucide-react";

import HireContactOverlay from "./HireContactOverlay";

interface PassengerServicesModalProps {
  vehicleId: string;
  vehicleName: string;
  driverId: string;
  onClose: () => void;
}

export default function PassengerServicesModal({ vehicleId, vehicleName, driverId, onClose }: PassengerServicesModalProps) {
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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="relative bg-[#1A1A1A] text-white border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-white/10 bg-white/5">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">Available Routes</h2>
            <p className="text-[10px] md:text-xs text-white/60 mt-1">For: <span className="font-bold text-white">{vehicleName}</span></p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setShowContactOverlay(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-lg transition-colors border border-brand-primary/50 whitespace-nowrap"
            >
              Contact Driver
            </button>
            <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors border border-white/10">
              <X className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
            </button>
          </div>
        </div>

        {/* Contact Overlay */}
        {showContactOverlay && (
          <HireContactOverlay driverId={driverId} onClose={() => setShowContactOverlay(false)} />
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>
          ) : services.length === 0 ? (
            <div className="text-center py-16 text-white/40 flex flex-col items-center">
              <MapPin className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg text-white/60">No routes listed</p>
              <p className="text-xs mt-2">This driver hasn't added specific routes for this vehicle yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={service.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-brand-primary/50 transition-colors relative overflow-hidden group">
                  {/* Subtle gradient accent */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-secondary to-brand-primary opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="pl-3">
                    <div className="flex flex-col gap-1 mb-3">
                      <div className="flex items-center gap-2 text-brand-primary font-bold">
                        <MapPin className="w-4 h-4" />
                        <span>{service.startPoint}</span>
                      </div>
                      <div className="w-0.5 h-3 bg-white/20 ml-2"></div>
                      <div className="flex items-center gap-2 text-white font-bold">
                        <MapPin className="w-4 h-4 text-brand-secondary" />
                        <span>{service.destination}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 border-t border-white/10 pt-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Price</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black">₦{service.price}</span>
                          {service.isNegotiable ? (
                            <span className="text-green-400 bg-green-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase border border-green-500/20">Negotiable</span>
                          ) : (
                            <span className="text-white/60 bg-white/10 px-2 py-0.5 rounded text-[9px] font-bold uppercase border border-white/10">Fixed</span>
                          )}
                        </div>
                      </div>
                      
                      {service.description && (
                        <button 
                          onClick={() => setExpandedDesc(expandedDesc === service.id ? null : service.id)}
                          className="flex items-center gap-1 text-xs font-medium text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Details {expandedDesc === service.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    
                    {service.description && expandedDesc === service.id && (
                      <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5 text-sm text-white/80 animate-in slide-in-from-top-2">
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
    </div>
  );
}
