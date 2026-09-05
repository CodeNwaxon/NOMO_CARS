"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Car, Eye } from "lucide-react";
import { getVIPBadge } from "@/lib/constants";
import Link from "next/link";

interface VehicleViewModalProps {
  vehicle: any;
  allVehicles: any[];
  onClose: () => void;
  onViewServices: (vehicleId: string, vehicleName: string, driverId: string) => void;
  onHire: (driverId: string) => void;
}

export default function VehicleViewModal({ vehicle, allVehicles, onClose, onViewServices, onHire }: VehicleViewModalProps) {
  // Setup images array
  const images = vehicle.images ? Object.values(vehicle.images).filter(Boolean) as string[] : [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Other vehicles (same category, not this vehicle), sorted by VIP stars descending
  const otherVehicles = allVehicles
    .filter(v => v.id !== vehicle.id)
    .sort((a, b) => (b.driverVipStars || 0) - (a.driverVipStars || 0));
    
  const [visibleCount, setVisibleCount] = useState(20);
  
  const handleNextImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };
  
  const handlePrevImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 20);
  };

  const visibleOtherVehicles = otherVehicles.slice(0, visibleCount);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-background/95 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-card-border">
        <h2 className="text-xl font-bold truncate pr-4">{vehicle.details.make} {vehicle.details.model}</h2>
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card-border hover:bg-card-border/80 transition-colors flex-shrink-0"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full pb-20">
        {/* Image Carousel */}
        <div className="relative w-full aspect-video md:aspect-[21/9] bg-black/10 dark:bg-white/5 overflow-hidden flex items-center justify-center group">
          {images.length > 0 ? (
            <>
              <img 
                src={images[currentImageIndex]} 
                alt="Vehicle view" 
                className="w-full h-full object-cover"
              />
              {/* Desktop Nav Arrows */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100 hidden md:flex"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100 hidden md:flex"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Image Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    {images.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? "bg-white scale-125" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-foreground/40">
              <Car className="w-16 h-16 mb-2" />
              <p>No images provided</p>
            </div>
          )}
        </div>

        {/* Action Buttons (Base of Image) */}
        <div className="flex w-full">
          <button 
            onClick={() => onHire(vehicle.driverId)}
            className="flex-2 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-lg transition-colors flex-grow shadow-lg shadow-brand-primary/20"
          >
            Hire Now
          </button>
          <button 
            onClick={() => onViewServices(vehicle.id, `${vehicle.details.make} ${vehicle.details.model}`, vehicle.driverId)}
            className="flex-1 py-4 bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold text-lg transition-colors"
          >
            Services
          </button>
        </div>

        {/* Vehicle Information */}
        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider mb-2">Specifications</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-card-border/30 p-3 rounded-xl border border-card-border/50">
                    <span className="text-[10px] text-foreground/50 uppercase block">Year</span>
                    <span className="font-bold">{vehicle.details.year || "N/A"}</span>
                  </div>
                  <div className="bg-card-border/30 p-3 rounded-xl border border-card-border/50">
                    <span className="text-[10px] text-foreground/50 uppercase block">Color</span>
                    <span className="font-bold">{vehicle.details.color || "N/A"}</span>
                  </div>
                  <div className="bg-card-border/30 p-3 rounded-xl border border-card-border/50">
                    <span className="text-[10px] text-foreground/50 uppercase block">Air Conditioning</span>
                    <span className="font-bold">{vehicle.details.ac ? "Yes" : "No"}</span>
                  </div>
                  {vehicle.details.seats && (
                    <div className="bg-card-border/30 p-3 rounded-xl border border-card-border/50">
                      <span className="text-[10px] text-foreground/50 uppercase block">Seats</span>
                      <span className="font-bold">{vehicle.details.seats}</span>
                    </div>
                  )}
                  {vehicle.details.payload && (
                    <div className="bg-card-border/30 p-3 rounded-xl border border-card-border/50">
                      <span className="text-[10px] text-foreground/50 uppercase block">Payload</span>
                      <span className="font-bold">{vehicle.details.payload} Tons</span>
                    </div>
                  )}
                  {vehicle.details.capacity && (
                    <div className="bg-card-border/30 p-3 rounded-xl border border-card-border/50">
                      <span className="text-[10px] text-foreground/50 uppercase block">Capacity</span>
                      <span className="font-bold">{vehicle.details.capacity}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider mb-2">Driver Information</h3>
                <div className="flex items-center gap-4 bg-card-border/30 p-4 rounded-xl border border-card-border/50">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{vehicle.driverName}</h4>
                    <p className="text-sm text-foreground/60">{vehicle.driverCity}{vehicle.driverCity && vehicle.driverState ? ', ' : ''}{vehicle.driverState}</p>
                    {getVIPBadge(vehicle.driverVipStars) && (
                      <div className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${getVIPBadge(vehicle.driverVipStars)?.colorClass}`}>
                        {getVIPBadge(vehicle.driverVipStars)?.tag} Driver
                      </div>
                    )}
                  </div>
                  <Link href={`/driver/profile/${vehicle.driverId}`}>
                    <button className="px-4 py-2 bg-brand-primary/10 text-brand-primary font-bold rounded-xl hover:bg-brand-primary hover:text-white transition-colors">
                      View Profile
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Vehicles Section */}
        {otherVehicles.length > 0 && (
          <div className="mt-8 border-t border-card-border pt-8 px-4 md:px-8">
            <h3 className="text-xl font-bold mb-6">Other {vehicle.category}s You Might Like</h3>
            
            <div className="flex overflow-x-auto gap-4 pb-6 snap-x custom-scrollbar">
              {visibleOtherVehicles.map(v => (
                <div key={v.id} className="min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px] flex-shrink-0 snap-start glass-panel rounded-2xl overflow-hidden group hover:shadow-xl hover:shadow-brand-secondary/10 transition-all duration-300 flex flex-col">
                  {/* Similar card design as the main category page */}
                  <div className="h-40 w-full bg-card-border relative overflow-hidden group/img">
                    {v.images?.front ? (
                      <img
                        src={v.images.front}
                        alt={`${v.details.make} ${v.details.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground/30">
                        <Car className="w-10 h-10" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                      {v.details.payload ? `${v.details.payload} Tons` : v.details.seats ? `${v.details.seats} Seats` : v.details.capacity ? `${v.details.capacity} Cap.` : "Standard"}
                    </div>
                    
                    {getVIPBadge(v.driverVipStars) && (
                      <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md ${getVIPBadge(v.driverVipStars)?.colorClass}`}>
                        {getVIPBadge(v.driverVipStars)?.tag} Driver
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <h4 className="font-bold mb-1 truncate">{v.details.make} {v.details.model}</h4>
                    <p className="text-[10px] text-foreground/60 mb-3 truncate">
                      {v.details.year} • {v.details.color || "Standard Color"}
                    </p>
                    
                    <div className="mt-auto flex gap-2 border-t border-card-border pt-3">
                      <button 
                        onClick={() => onHire(v.driverId)}
                        className="flex-2 py-2 text-xs bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-lg transition-colors flex-grow"
                      >
                        Hire
                      </button>
                      <button
                        onClick={() => onViewServices(v.id, `${v.details.make} ${v.details.model}`, v.driverId)}
                        className="flex-1 py-2 text-xs bg-brand-secondary/10 hover:bg-brand-secondary text-brand-secondary hover:text-white font-bold rounded-lg transition-colors"
                      >
                        Services
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Load More Card */}
              {visibleCount < otherVehicles.length && (
                <div className="min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px] flex-shrink-0 snap-start glass-panel rounded-2xl flex items-center justify-center border-dashed border-2 hover:border-brand-primary hover:bg-brand-primary/5 transition-all cursor-pointer" onClick={handleLoadMore}>
                  <div className="flex flex-col items-center gap-3 text-brand-primary">
                    <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                    <span className="font-bold">Load More Vehicles</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
