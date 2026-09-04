"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, Car, Search, PlusCircle, Briefcase, User, Star } from "lucide-react";
import { getVIPBadge } from "@/lib/constants";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [driverSearchResults, setDriverSearchResults] = useState<any[]>([]);
  const [searchingDrivers, setSearchingDrivers] = useState(false);

  // Debounced search for drivers by username
  useEffect(() => {
    const searchDrivers = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setDriverSearchResults([]);
        return;
      }
      
      setSearchingDrivers(true);
      try {
        const q = query(collection(db, "users"), where("role", "==", "driver"));
        const snapshot = await getDocs(q);
        const drivers: any[] = [];
        const queryLower = searchQuery.toLowerCase();
        
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.username && data.username.toLowerCase().includes(queryLower)) {
            // Only include drivers with an active ticket
            if (data.ticketExpiry && new Date(data.ticketExpiry) > new Date()) {
              drivers.push({ id: doc.id, ...data });
            }
          }
        });
        
        setDriverSearchResults(drivers);
      } catch (err) {
        console.error("Error searching drivers:", err);
      } finally {
        setSearchingDrivers(false);
      }
    };
    
    const t = setTimeout(searchDrivers, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    window.scrollTo(0, 0);

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

        const vehiclesWithDrivers = fetchedVehicles
          .filter(v => {
            // Only show vehicles from drivers with an active ticket
            const driverData = driversMap[v.driverId];
            if (!driverData?.ticketExpiry) return false;
            return new Date(driverData.ticketExpiry) > new Date();
          })
          .map(v => ({
            ...v,
            driverCity: driversMap[v.driverId]?.operatingCity || "",
            driverState: driversMap[v.driverId]?.operatingState || "",
            driverVipStars: driversMap[v.driverId]?.vipStars || 0,
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
          <div className="flex flex-col xl:flex-row gap-3 md:gap-4 w-full xl:w-auto xl:items-center">
            <div className="flex flex-row gap-2 md:gap-4 w-full xl:w-auto">
              {/* Search Input */}
              <div className="relative flex-grow xl:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 md:h-5 md:w-5 text-foreground/50" />
                </div>
                <input
                  type="text"
                  placeholder="Search city/state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 md:pl-11 pr-4 py-2 md:py-2 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
                />
              </div>

              {/* Buttons beside search for Non-Driver */}
              {!isDriver && (
                <button className="flex items-center justify-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-6 md:py-2 bg-brand-primary text-white rounded-xl font-medium text-sm md:text-base hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 border border-brand-primary/50 flex-shrink-0">
                  <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Create Bid</span>
                </button>
              )}
            </div>

            {/* Additional buttons for Drivers */}
            {isDriver && (
              <div className="flex flex-row gap-2 md:gap-4 w-full xl:w-auto">
                {profile?.isApproved && (
                  <button className="flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-6 md:py-2 bg-brand-secondary text-white rounded-xl font-medium text-sm md:text-base hover:bg-brand-secondary/90 transition-all shadow-lg hover:shadow-brand-secondary/30 hover:-translate-y-0.5 flex-1 xl:flex-none">
                    <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Bid for jobs</span>
                  </button>
                )}
                <button className="flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-6 md:py-2 bg-brand-primary text-white rounded-xl font-medium text-sm md:text-base hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 border border-brand-primary/50 flex-1 xl:flex-none">
                  <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Create Bid</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {(() => {
          const filteredVehicles = vehicles.filter((v) => {
            const queryText = searchQuery.toLowerCase();
            const city = (v.driverCity || "").toLowerCase();
            const state = (v.driverState || "").toLowerCase();
            return city.includes(queryText) || state.includes(queryText);
          });

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
              
              {/* Driver Search Results */}
              {searchQuery && driverSearchResults.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
                    <User className="text-brand-primary" /> Driver Profiles Found
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {driverSearchResults.map(driver => (
                      <div key={driver.id} className="glass-panel p-6 rounded-2xl flex items-center gap-4 hover:shadow-lg transition-all border border-brand-primary/20">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          {getVIPBadge(driver.vipStars) && (
                            <div className={`absolute -top-1 -right-1 z-10 px-1 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider shadow-lg ${getVIPBadge(driver.vipStars)?.colorClass}`}>
                              {getVIPBadge(driver.vipStars)?.tag}
                            </div>
                          )}
                          <div className="w-full h-full rounded-full overflow-hidden bg-card-border">
                            {driver.displayImage ? (
                              <img src={driver.displayImage} alt={driver.username} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-xl uppercase">
                                {driver.username?.charAt(0) || "D"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate flex items-center gap-2">
                            {driver.username} 
                            {driver.vipStars >= 1 && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                          </h3>
                          <p className="text-sm text-foreground/60 truncate">{driver.operatingCity || "No city set"}</p>
                          <Link 
                            href={`/driver/profile/${driver.id}`}
                            className="mt-2 text-xs font-semibold text-brand-primary hover:underline inline-block"
                          >
                            View Profile →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredVehicles.length === 0 && (!searchQuery || driverSearchResults.length === 0) ? (
                <div className="glass-panel rounded-2xl md:p-12 p-6 text-center flex flex-col items-center max-w-2xl mx-auto">
                  <div className="w-24 h-24 bg-card-border/50 rounded-full flex items-center justify-center mb-4">
                    <Car className="w-12 h-12 text-foreground/50" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">No Transports Found</h2>
                  <p className="px-2 text-foreground/70 mb-6">
                    {searchQuery ? "No transports or drivers match your search." : "No transport found choose another category"}
                  </p>
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
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
                    {searchQuery && <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2"><Car className="text-brand-secondary" /> Vehicles Found</h2>}
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-8">
                      {displayedVehicles.map((v) => (
                        <div key={v.id} className="glass-panel rounded-xl md:rounded-3xl overflow-hidden group hover:shadow-xl hover:shadow-brand-secondary/10 transition-all duration-300">
                          <div className="h-32 md:h-48 w-full bg-card-border relative overflow-hidden">
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
                            <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-background/80 backdrop-blur-md px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold shadow-sm">
                              {v.details.seats} Seats
                            </div>
                            {getVIPBadge(v.driverVipStars) && (
                              <div className={`absolute top-2 left-2 md:top-4 md:left-4 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md ${getVIPBadge(v.driverVipStars)?.colorClass}`}>
                                {getVIPBadge(v.driverVipStars)?.tag} Driver
                              </div>
                            )}
                          </div>

                          <div className="p-3 md:p-6">
                            <h3 className="text-sm md:text-xl font-bold mb-1 truncate">{v.details.make} {v.details.model}</h3>
                            <p className="text-[10px] md:text-sm text-foreground/60 mb-2 md:mb-4 border-b border-card-border pb-2 md:pb-4 truncate">
                              Yr: {v.details.year} • AC: {v.details.ac ? "Yes" : "No"}
                            </p>

                            <button className="w-full py-2 md:py-3 text-xs md:text-base bg-brand-secondary/10 hover:bg-brand-secondary text-brand-secondary hover:text-white font-medium rounded-lg md:rounded-xl transition-colors">
                              View
                            </button>
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
    </div>
  );
}
