"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, Car, Search, PlusCircle, Briefcase } from "lucide-react";
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

        const vehiclesWithDrivers = fetchedVehicles.map(v => ({
          ...v,
          driverCity: driversMap[v.driverId]?.operatingCity || "",
          driverState: driversMap[v.driverId]?.operatingState || "",
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

      <div className="max-w-6xl mx-auto z-10 relative">
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
              <h1 className="text-xl md:text-4xl font-bold capitalize text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
                {getPluralCategory(category)} Available
              </h1>
              <p className="text-xs md:text-md text-foreground/70">Find and book approved your <span className="font-bold">{category}</span> transport.</p>
            </div>
          </div>

          {/* Search and Action Buttons */}
          <div className="flex flex-col gap-4 w-full xl:w-auto">
            <div className="flex flex-row gap-2 md:gap-4">
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
                  className="w-full pl-9 md:pl-11 pr-4 py-1.5 md:py-2 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-base rounded-xl"
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
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full">
                <button className="flex items-center justify-center gap-1.5 md:gap-2 px-4 py-1.5 md:px-6 md:py-2 bg-brand-secondary text-white rounded-xl font-medium text-sm md:text-base hover:bg-brand-secondary/90 transition-all shadow-lg hover:shadow-brand-secondary/30 hover:-translate-y-0.5 flex-1">
                  <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Bid for jobs</span>
                </button>
                <button className="flex items-center justify-center gap-1.5 md:gap-2 px-4 py-1.5 md:px-6 md:py-2 bg-brand-primary text-white rounded-xl font-medium text-sm md:text-base hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 border border-brand-primary/50 flex-1">
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

          if (loading) {
            return (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-brand-secondary animate-spin mb-4" />
                <p className="text-foreground/70">Loading available transports...</p>
              </div>
            );
          }

          if (filteredVehicles.length === 0) {
            return (
              <div className="px-3 md:px-0">
                <div className="glass-panel rounded-2xl md:p-12 p-6 text-center flex flex-col items-center max-w-2xl mx-auto">
                  <div className="w-24 h-24 bg-card-border/50 rounded-full flex items-center justify-center mb-4">
                    <Car className="w-12 h-12 text-foreground/50" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">No Transports Found</h2>
                  <p className="px-2 text-foreground/70 mb-6">
                    {searchQuery ? "No transports match your search in this location." : "No transport found choose another category"}
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
              </div>
            );
          }

          const displayedVehicles = filteredVehicles.slice(0, visibleCount);

          return (
            <div className="px-1 md:px-0">
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
          );
        })()}
      </div>
    </div>
  );
}
