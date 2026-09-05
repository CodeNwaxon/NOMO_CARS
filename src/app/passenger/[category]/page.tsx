"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, Car, Search, PlusCircle, Briefcase, User, Star, MapPin, Eye } from "lucide-react";
import { VIP_PLANS, getVIPBadge, hasValidTicket } from "@/lib/constants";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PassengerServicesModal from "@/components/PassengerServicesModal";
import VehicleViewModal from "@/components/VehicleViewModal";
import HireContactOverlay from "@/components/HireContactOverlay";

export default function CategoryVehicles() {
  const params = useParams();
  const category = (params.category as string).replace("%20", " ");
  const router = useRouter();
  const { profile } = useAuth();
  const isDriver = profile?.role === "driver";

  const getPluralCategory = (cat: string) => {
    if (!cat) return "";
    const lowerCat = cat.toLowerCase();
    if (lowerCat === "bus") return "buses";
    if (lowerCat.endsWith("s")) return cat + "es";
    return cat + "s";
  };

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationQuery, setLocationQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [viewingServicesFor, setViewingServicesFor] = useState<{ id: string, name: string, driverId: string } | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<any | null>(null);
  const [hiringDriverId, setHiringDriverId] = useState<string | null>(null);
  const [showBidsModal, setShowBidsModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("bids") === "open") {
      setShowBidsModal(true);
    }

    const fetchCategoryVehicles = async () => {
      try {
        const q = query(
          collection(db, "vehicles"),
          where("category", "==", category),
          where("isApproved", "==", true)
        );
        const querySnapshot = await getDocs(q);
        const fetchedVehicles: any[] = [];
        querySnapshot.forEach((document) => {
          fetchedVehicles.push({ id: document.id, ...document.data() });
        });

        // Fetch driver profiles to get operating city and state
        const driverIds = [...new Set(fetchedVehicles.map(v => v.driverId).filter(Boolean))];
        const driversMap: Record<string, any> = {};

        await Promise.all(driverIds.map(async (id) => {
          const driverDoc = await getDoc(doc(db, "users", id as string));
          if (driverDoc.exists()) {
            driversMap[id as string] = driverDoc.data();
          }
        }));

        // Fetch vehicle services to get destinations
        const vehicleIds = fetchedVehicles.map(v => v.id);
        const servicesMap: Record<string, any[]> = {};
        
        if (vehicleIds.length > 0) {
          const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
          const idChunks = chunkArray(vehicleIds, 10);
          
          await Promise.all(idChunks.map(async (chunk) => {
            const sq = query(collection(db, "vehicleServices"), where("vehicleId", "in", chunk));
            const sSnap = await getDocs(sq);
            sSnap.forEach(serviceDoc => {
               const data = serviceDoc.data();
               if (!servicesMap[data.vehicleId]) servicesMap[data.vehicleId] = [];
               servicesMap[data.vehicleId].push(data);
            });
          }));
        }

        const vehiclesWithDrivers = fetchedVehicles
          .filter(v => {
            // Only show vehicles from drivers with an active ticket
            const driverData = driversMap[v.driverId];
            return hasValidTicket(driverData?.ticketExpiry);
          })
          .map(v => ({
            ...v,
            driverCity: driversMap[v.driverId]?.operatingCity || "",
            driverState: driversMap[v.driverId]?.operatingState || "",
            driverVipStars: driversMap[v.driverId]?.vipStars || 0,
            driverName: driversMap[v.driverId]?.username || driversMap[v.driverId]?.firstName || "Unknown",
            services: servicesMap[v.id] || [],
          }));

        setVehicles(vehiclesWithDrivers);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchCategoryVehicles();
    }
  }, [category]);

  return (
    <div className="min-h-screen px-1 py-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-brand-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto z-10 relative">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 mb-10 px-3 md:px-0">
          {/* Header Title and Back Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/passenger")}
              className="p-2 md:p-3 bg-card-bg hover:bg-card-border border border-card-border rounded-full transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>
            <div>
              <h1 className="text-xl md:text-3xl font-bold capitalize text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
                {getPluralCategory(category)} Available
              </h1>
              <p className="text-xs md:text-md text-foreground/70">Find and book approved your <span className="font-bold">{category}</span> transport.</p>
            </div>
          </div>

          {/* Search and Action Buttons */}
          <div className="flex flex-col-reverse xl:flex-row gap-3 md:gap-4 w-full xl:w-auto xl:items-center">
            
            {/* Search Inputs */}
            <div className="flex flex-row gap-2 md:gap-4 w-full xl:w-[32rem]">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 md:h-5 md:w-5 text-foreground/50" />
                </div>
                <input
                  type="text"
                  placeholder="Location"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full pl-9 md:pl-11 pr-2 py-2 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-[11px] sm:text-sm md:text-base rounded-xl"
                />
              </div>
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5 text-foreground/50" />
                </div>
                <input
                  type="text"
                  placeholder="Destination"
                  value={destinationQuery}
                  onChange={(e) => setDestinationQuery(e.target.value)}
                  className="w-full pl-9 md:pl-11 pr-2 py-2 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-[11px] sm:text-sm md:text-base rounded-xl"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row gap-2 md:gap-4 w-full xl:w-auto justify-start">
              {!isDriver && (
                <button 
                  onClick={() => setShowBidsModal(true)}
                  className="flex items-center justify-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-2 bg-brand-primary text-white rounded-xl font-medium text-xs sm:text-sm md:text-base hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 border border-brand-primary/50"
                >
                  <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  <span>Create Bid</span>
                </button>
              )}
              {isDriver && (
                <>
                  {profile?.isApproved && (
                    <button 
                      onClick={() => setShowBidsModal(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-6 md:py-2 bg-brand-secondary text-white rounded-xl font-medium text-xs sm:text-sm md:text-base hover:bg-brand-secondary/90 transition-all shadow-lg hover:shadow-brand-secondary/30 hover:-translate-y-0.5"
                    >
                      <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                      <span>Bid for jobs</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowBidsModal(true)}
                    className={`${profile?.isApproved ? 'flex-1 sm:flex-none' : ''} flex items-center justify-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-2 bg-brand-primary text-white rounded-xl font-medium text-xs sm:text-sm md:text-base hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 border border-brand-primary/50`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    <span>Create Bid</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {(() => {
          const filteredVehicles = vehicles.filter((v) => {
            const locQuery = locationQuery.toLowerCase();
            const destQuery = destinationQuery.toLowerCase();
            
            // Check location match against driver city/state or any service start point
            const locMatches = locQuery === "" || 
              (v.driverCity || "").toLowerCase().includes(locQuery) || 
              (v.driverState || "").toLowerCase().includes(locQuery) ||
              (v.services || []).some((s: any) => (s.startPoint || "").toLowerCase().includes(locQuery));
              
            // Check destination match against any service destination
            const destMatches = destQuery === "" || 
              (v.services || []).some((s: any) => (s.destination || "").toLowerCase().includes(destQuery));
              
            return locMatches && destMatches;
          }).sort((a, b) => (b.driverVipStars || 0) - (a.driverVipStars || 0));

          const displayedVehicles = filteredVehicles.slice(0, visibleCount);

          if (loading) {
            return (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-brand-secondary animate-spin mb-4" />
                <p className="text-foreground/70">Loading available transports...</p>
              </div>
            );
          }

          return (
            <div className="px-1 md:px-0">

              {filteredVehicles.length === 0 ? (
                <div className="glass-panel rounded-2xl md:p-12 p-6 text-center flex flex-col items-center max-w-2xl mx-auto">
                  <div className="w-24 h-24 bg-card-border/50 rounded-full flex items-center justify-center mb-4">
                    <Car className="w-12 h-12 text-foreground/50" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">No Transports Found</h2>
                  <p className="px-2 text-foreground/70 mb-6">
                    {(locationQuery || destinationQuery) ? "No transports or drivers match your search." : "No transport found choose another category"}
                  </p>
                  {(locationQuery || destinationQuery) ? (
                    <button
                      onClick={() => { setLocationQuery(""); setDestinationQuery(""); }}
                      className="px-4 py-2 md:px-8 md:py-4 bg-brand-secondary text-sm md:text-base text-white font-medium rounded-lg md:rounded-xl hover:bg-brand-secondary/90 transition-colors shadow-lg shadow-brand-secondary/30"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <Link
                      href="/passenger"
                      className="px-4 py-2 md:px-8 md:py-4 bg-brand-secondary text-sm md:text-base text-white font-medium rounded-lg md:rounded-xl hover:bg-brand-secondary/90 transition-colors shadow-lg shadow-brand-secondary/30"
                    >
                      Browse Other Categories
                    </Link>
                  )}
                </div>
              ) : (
                filteredVehicles.length > 0 && (
                  <div>
                    {(locationQuery || destinationQuery) && <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2"><Car className="text-brand-secondary" /> Vehicles Found</h2>}
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-8">
                      {displayedVehicles.map((v) => (
                        <div key={v.id} className="glass-panel rounded-xl md:rounded-3xl overflow-hidden group hover:shadow-xl hover:shadow-brand-secondary/10 transition-all duration-300">
                          <div className="h-32 md:h-48 w-full bg-card-border relative overflow-hidden group/img">
                            {v.images?.front ? (
                              <img
                                src={v.images.front}
                                alt={`${v.details.make} ${v.details.model}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-foreground/30">
                                <Car className="w-8 h-8 md:w-12 md:h-12" />
                              </div>
                            )}
                            
                            {/* Badges */}
                            <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-background/80 backdrop-blur-md px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold shadow-sm">
                              {v.details.payload ? `${v.details.payload} Tons` : v.details.seats ? `${v.details.seats} Seats` : v.details.capacity ? `${v.details.capacity} Cap.` : "Standard"}
                            </div>
                            
                            {getVIPBadge(v.driverVipStars) && (
                              <div className={`absolute top-2 left-2 md:top-4 md:left-4 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md ${getVIPBadge(v.driverVipStars)?.colorClass}`}>
                                {getVIPBadge(v.driverVipStars)?.tag} Driver
                              </div>
                            )}

                            {/* View Button Overlay on Image */}
                            <button
                              onClick={() => setViewingVehicle(v)}
                              className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity"
                            >
                              <Eye className="w-3 h-3 md:w-4 md:h-4" /> View
                            </button>
                          </div>

                          <div className="p-3 md:p-6 flex flex-col flex-grow">
                            <h3 className="text-sm md:text-xl font-bold mb-1 truncate">{v.details.make} {v.details.model}</h3>
                            <p className="text-[10px] md:text-sm text-foreground/60 mb-1 truncate">
                              {v.details.year} • {v.details.color || "Standard Color"} • AC: {v.details.ac ? "Yes" : "No"}
                            </p>
                            
                            <Link href={`/driver/profile/${v.driverId}`} className="text-[10px] md:text-sm text-brand-primary font-semibold hover:underline mt-1 mb-4 inline-block truncate">
                              View {v.driverName}'s Profile →
                            </Link>

                            <div className="mt-auto flex gap-2 w-full border-t border-card-border pt-3 md:pt-4">
                              <button 
                                onClick={() => setHiringDriverId(v.driverId)}
                                className="flex-2 py-2 md:py-3 text-[10px] md:text-sm bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-lg md:rounded-xl transition-colors flex-grow shadow-lg shadow-brand-primary/20"
                              >
                                Hire
                              </button>
                              <button
                                onClick={() => setViewingServicesFor({ id: v.id, name: `${v.details.make} ${v.details.model}`, driverId: v.driverId })}
                                className="flex-1 py-2 md:py-3 text-[10px] md:text-sm bg-brand-secondary/10 hover:bg-brand-secondary text-brand-secondary hover:text-white font-bold rounded-lg md:rounded-xl transition-colors flex flex-col items-center justify-center"
                              >
                                Services
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {visibleCount < filteredVehicles.length && (
                      <div className="flex justify-center mt-8 md:mt-12">
                        <button
                          onClick={() => setVisibleCount(prev => prev + 30)}
                          className="px-6 py-3 bg-card-bg border border-card-border hover:bg-card-border rounded-xl font-medium transition-colors shadow-sm"
                        >
                          Load More Transports
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          );
        })()}
      </div>

      {/* Modals & Overlays */}
      {viewingServicesFor && (
        <PassengerServicesModal
          vehicleId={viewingServicesFor.id}
          vehicleName={viewingServicesFor.name}
          driverId={viewingServicesFor.driverId}
          onClose={() => setViewingServicesFor(null)}
        />
      )}

      {viewingVehicle && (
        <VehicleViewModal
          vehicle={viewingVehicle}
          allVehicles={vehicles.filter(v => v.id !== viewingVehicle.id)} // Pass other vehicles
          onClose={() => setViewingVehicle(null)}
          onViewServices={(vid, vname, did) => {
            setViewingVehicle(null);
            setViewingServicesFor({ id: vid, name: vname, driverId: did });
          }}
          onHire={(driverId) => {
            // Keep view modal open or close it? Let's close it so the hire overlay is clear, or just open hire overlay on top
            setHiringDriverId(driverId);
          }}
        />
      )}

      {hiringDriverId && (
        <HireContactOverlay
          driverId={hiringDriverId}
          onClose={() => setHiringDriverId(null)}
        />
      )}

      {/* Bids Modal */}
      {showBidsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background dark:bg-[#0f172a] bg-[#f8fafc] border border-card-border rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowBidsModal(false);
                const newUrl = window.location.pathname;
                window.history.pushState({}, '', newUrl);
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-card-border/50 text-foreground/50 hover:bg-card-border hover:text-foreground transition-all"
            >
              ✕
            </button>
            <div className="w-20 h-20 bg-card-border/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-card-border shadow-inner">
              <Briefcase className="w-10 h-10 text-foreground/40" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Available Jobs ({category})</h2>
            <div className="bg-foreground/5 border border-card-border border-dashed rounded-2xl p-8 py-12">
              <p className="text-foreground/60 font-medium text-lg">No jobs found</p>
              <p className="text-xs text-foreground/40 mt-2 max-w-xs mx-auto">There are currently no passenger requests for this vehicle category in your area.</p>
            </div>
            <button
              onClick={() => {
                setShowBidsModal(false);
                const newUrl = window.location.pathname;
                window.history.pushState({}, '', newUrl);
              }}
              className="w-full mt-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
