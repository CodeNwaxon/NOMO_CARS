"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Bike,
  Car,
  Bus,
  Truck,
  Plane,
  Ship,
  Navigation,
  Users,
  Phone,
  ArrowRight,
  ShieldOff,
  Search,
  User,
  Star,
  Info,
  Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, doc, getDoc, query, where, limit, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getVIPBadge } from "@/lib/constants";

const categories = [
  { name: "Dispatch Rider", id: "dispatch-rider", icon: Bike, color: "text-orange-500", bg: "bg-orange-500/10", hoverBorder: "hover:border-orange-500/50", hoverShadow: "hover:shadow-orange-500/20" },
  { name: "Keke (Tricycle)", id: "keke", icon: Navigation, color: "text-green-500", bg: "bg-green-500/10", hoverBorder: "hover:border-green-500/50", hoverShadow: "hover:shadow-green-500/20" },
  { name: "Car", id: "car", icon: Car, color: "text-blue-500", bg: "bg-blue-500/10", hoverBorder: "hover:border-blue-500/50", hoverShadow: "hover:shadow-blue-500/20" },
  { name: "Bus", id: "bus", icon: Bus, color: "text-indigo-500", bg: "bg-indigo-500/10", hoverBorder: "hover:border-indigo-500/50", hoverShadow: "hover:shadow-indigo-500/20" },
  { name: "Mini Van", id: "mini van", icon: Bus, color: "text-violet-500", bg: "bg-violet-500/10", hoverBorder: "hover:border-violet-500/50", hoverShadow: "hover:shadow-violet-500/20" },
  { name: "Van", id: "van", icon: Truck, color: "text-cyan-500", bg: "bg-cyan-500/10", hoverBorder: "hover:border-cyan-500/50", hoverShadow: "hover:shadow-cyan-500/20" },
  { name: "Truck", id: "truck", icon: Truck, color: "text-rose-500", bg: "bg-rose-500/10", hoverBorder: "hover:border-rose-500/50", hoverShadow: "hover:shadow-rose-500/20" },
  { name: "Airplane (Cargo)", id: "airplane", icon: Plane, color: "text-sky-500", bg: "bg-sky-500/10", hoverBorder: "hover:border-sky-500/50", hoverShadow: "hover:shadow-sky-500/20" },
  { name: "Ship", id: "ship", icon: Ship, color: "text-teal-500", bg: "bg-teal-500/10", hoverBorder: "hover:border-teal-500/50", hoverShadow: "hover:shadow-teal-500/20" },
];

export default function PassengerCategories() {
  const { user, profile } = useAuth();
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showHowToBidModal, setShowHowToBidModal] = useState(false);
  const [favoriteDrivers, setFavoriteDrivers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);


  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      try {
        setLoadingContacts(true);
        const favSnap = await getDocs(collection(db, "users", user.uid, "favorites"));
        const driverPromises = favSnap.docs.map(async (d) => {
          const driverDoc = await getDoc(doc(db, "users", d.id));
          if (driverDoc.exists()) {
            return { id: d.id, ...driverDoc.data() };
          }
          return null;
        });

        const drivers = (await Promise.all(driverPromises)).filter(Boolean);
        setFavoriteDrivers(drivers);
      } catch (err) {
        console.error("Error fetching favorites:", err);
      } finally {
        setLoadingContacts(false);
      }
    };

    if (showContactsModal) {
      fetchFavorites();
    }
  }, [user, showContactsModal]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setLastVisibleDoc(null);
      setHasMoreSearch(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchSearchResults();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSearchResults = async (loadMore = false) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const qLower = searchQuery.toLowerCase();

      let baseQuery = query(
        collection(db, "users"),
        where("role", "==", "driver"),
        limit(40)
      );

      // We will perform a client-side filter for simplicity since Firestore doesn't easily support case-insensitive substring search across multiple fields without extensions.
      // But to avoid loading all drivers, we just load in batches. Note: This means pagination combined with client-side filtering can be tricky if we don't fetch enough.
      // A robust full-text search requires a 3rd party like Algolia. We will fetch 40 drivers per query.

      if (loadMore && lastVisibleDoc) {
        baseQuery = query(
          collection(db, "users"),
          where("role", "==", "driver"),
          startAfter(lastVisibleDoc),
          limit(40)
        );
      }

      const querySnapshot = await getDocs(baseQuery);

      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const searchStr = `${data.username || ""} ${data.firstName || ""} ${data.lastName || ""} ${data.operatingState || ""} ${data.operatingCity || ""}`.toLowerCase();

        if (searchStr.includes(qLower)) {
          results.push({ id: doc.id, ...data });
        }
      });

      results.sort((a, b) => (b.vipStars || 0) - (a.vipStars || 0));

      if (loadMore) {
        setSearchResults(prev => {
          const combined = [...prev, ...results];
          return combined.sort((a, b) => (b.vipStars || 0) - (a.vipStars || 0));
        });
      } else {
        setSearchResults(results);
      }

      setLastVisibleDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMoreSearch(querySnapshot.docs.length === 40);

    } catch (error) {
      console.error("Error searching drivers:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen py-8 md:py-16 px-3 md:px-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand-secondary/10 rounded-full blur-3xl -z-10 animate-pulse-slow pointer-events-none"></div>

      <div className="max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-6 md:mb-8 relative flex flex-col items-center">
          <h1 className="text-2xl md:text-5xl font-bold mb-4 md:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
            Choose Your Ride
          </h1>

          <div className="w-full max-w-2xl px-4 mx-auto mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-foreground/50" />
              </div>
              <input
                type="text"
                placeholder="Search for drivers, names, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm md:text-base w-full pl-10 md:pl-12 pr-4 py-1.5 md:py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base rounded-2xl md:rounded-xl"
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Loader2 className="h-5 w-5 text-brand-primary animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center w-full mt-4 md:mt-0 px-2 md:px-0 md:absolute md:inset-x-0 md:top-2 pointer-events-none">
            <button
              onClick={() => setShowHowToBidModal(true)}
              className="pointer-events-auto flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-transparent text-black dark:text-blue-400 font-bold text-xs md:text-sm hover:underline transition-all"
            >
              <Info className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Learn how to create / find bids</span>
              <span className="sm:hidden">Create / find bids</span>
            </button>
            <button
              onClick={() => setShowContactsModal(true)}
              className="pointer-events-auto flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-brand-primary text-white rounded-xl font-medium text-xs md:text-sm hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 border border-brand-primary/50"
            >
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>My Contacts</span>
            </button>
          </div>
        </div>

        {searchQuery.trim() ? (
          // Search Results View
          <div className="px-1 md:px-0">
            {searchResults.length > 0 ? (
              <div className="mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
                  <User className="text-brand-primary" /> Driver Profiles Found
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
                  {searchResults.map((driver, index) => (
                    <Link href={`/driver/profile/${driver.id}`} key={`${driver.id}-${index}`} className="block">
                      <div className="glass-panel p-3 md:p-6 rounded-md md:rounded-2xl flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-2 md:gap-4 hover:shadow-lg transition-all border border-brand-primary/20 hover:border-brand-primary/50 cursor-pointer h-full">
                        <div className="relative w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
                          {getVIPBadge(driver.vipStars) && (
                            <div className={`absolute -top-1 -right-1 z-10 px-1 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider shadow-lg ${getVIPBadge(driver.vipStars)?.colorClass}`}>
                              {getVIPBadge(driver.vipStars)?.tag}
                            </div>
                          )}
                          <div className="w-full h-full rounded-full overflow-hidden bg-card-border">
                            {driver.displayImage ? (
                              <img src={driver.displayImage} alt={driver.username} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-lg md:text-xl uppercase">
                                {driver.username?.charAt(0) || driver.firstName?.charAt(0) || "D"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 w-full flex flex-col items-center md:items-start">
                          <h3 className="font-bold text-sm md:text-lg w-full truncate flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2">
                            <span className="truncate">{driver.username || driver.firstName}</span>
                            {driver.vipStars >= 1 && driver.vipStars < 5 && (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            )}
                            {driver.vipStars === 5 && (
                              <span className="flex items-center justify-center gap-1 text-[8px] md:text-[10px] font-black text-amber-500 bg-gradient-to-br from-slate-900 to-black px-2 py-0.5 rounded-full border border-slate-700 shadow-md">
                                ULTIMATE VIP <Star className="w-2 h-2 md:w-3 md:h-3 fill-amber-500" />
                              </span>
                            )}
                          </h3>
                          <p className="text-[10px] md:text-sm text-foreground/60 w-full truncate mt-0.5">{driver.operatingCity || "No city set"}</p>

                          <div className="flex items-center justify-center md:justify-start gap-0.5 mt-1.5 mb-1 w-full">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-2 h-2 md:w-3 md:h-3 ${star <= Math.round(Number(driver.rating || 5.0)) ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600 fill-gray-300 dark:fill-gray-600"}`}
                              />
                            ))}
                            <span className="text-[9px] md:text-[10px] font-medium text-gray-500 dark:text-gray-400 ml-1">
                              ({Number(driver.rating || 5.0).toFixed(1)})
                            </span>
                          </div>

                          <div className="mt-1 text-xs font-semibold text-brand-primary inline-block">
                            View Profile →
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {hasMoreSearch && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => fetchSearchResults(true)}
                      className="px-6 py-3 bg-card-border/50 text-foreground font-bold rounded-xl hover:bg-card-border transition-colors border border-card-border flex items-center gap-2"
                    >
                      {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Load More"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              !isSearching && (
                <div className="text-center py-20 bg-foreground/5 rounded-3xl border border-card-border border-dashed mt-8">
                  <User className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No Drivers Found</h3>
                  <p className="text-foreground/60 max-w-md mx-auto">
                    We couldn't find any drivers matching "{searchQuery}". Try a different name or location.
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          // Categories View (Default)
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link key={cat.id} href={`/passenger/${cat.id}`} className="group block">
                  <div className={`glass-panel rounded-lg md:rounded-2xl p-4 md:p-8 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${cat.hoverShadow} border-2 border-transparent ${cat.hoverBorder} h-full`}>
                    <div className={`w-16 h-16 rounded-full ${cat.bg} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:${cat.bg.replace('/10', '/20')} transition-all duration-300`}>
                      <Icon className={`w-8 h-8 ${cat.color}`} />
                    </div>
                    <h3 className="font-bold text-lg">{cat.name}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showContactsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background dark:bg-[#0f172a] bg-[#f8fafc] border border-card-border rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative zoom-in-95 duration-200">
            <button
              onClick={() => setShowContactsModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-card-border/50 text-foreground/50 hover:bg-card-border hover:text-foreground transition-all"
            >
              ✕
            </button>
            <div className="w-16 h-16 bg-card-border/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-card-border">
              <Users className="w-8 h-8 text-foreground/50" />
            </div>
            <h2 className="text-xl font-bold mb-4">My Contacts</h2>

            <div className="max-h-[60vh] overflow-y-auto px-2 mb-6 space-y-3">
              {loadingContacts ? (
                <div className="flex flex-col items-center justify-center py-8 text-foreground/50">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Loading contacts...</p>
                </div>
              ) : favoriteDrivers.length === 0 ? (
                <p className="text-foreground/70 py-8 text-sm">
                  No contacts found. You haven't added any favorite drivers yet.
                </p>
              ) : (
                favoriteDrivers.map(driver => {
                  const hasTicket = driver.ticketExpiry ? new Date(driver.ticketExpiry) > new Date() : false;

                  return (
                    <div key={driver.id} className="flex items-center gap-3 p-3 glass-panel rounded-xl border border-card-border hover:border-brand-primary/30 transition-all text-left">
                      <div className="w-12 h-12 rounded-full bg-card-border overflow-hidden flex-shrink-0">
                        {driver.displayImage ? (
                          <img src={driver.displayImage} alt={driver.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-lg uppercase">
                            {driver.username?.charAt(0) || driver.firstName?.charAt(0) || "D"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate flex items-center gap-1">
                          <span className="truncate">{driver.username || driver.firstName}</span>
                          {driver.vipStars >= 1 && driver.vipStars < 5 && (
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                          {driver.vipStars === 5 && (
                            <span className="flex items-center justify-center gap-1 text-[8px] font-black text-amber-500 bg-gradient-to-br from-slate-900 to-black px-1.5 py-0.5 rounded-full border border-slate-700 shadow-md flex-shrink-0">
                              VIP <Star className="w-2 h-2 fill-amber-500" />
                            </span>
                          )}
                        </h4>
                        {hasTicket && driver.phone ? (
                          <div className="flex flex-col mt-0.5 gap-1">
                            <p className="text-xs text-foreground/60 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-brand-primary" /> {driver.phone}
                            </p>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-2.5 h-2.5 ${star <= Math.round(Number(driver.rating || 5.0)) ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600 fill-gray-300 dark:fill-gray-600"}`}
                                />
                              ))}
                              <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 ml-1">
                                ({Number(driver.rating || 5.0).toFixed(1)})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-rose-500/80 flex items-center gap-1 mt-0.5">
                            <ShieldOff className="w-3 h-3" /> Contact hidden
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/driver/profile/${driver.id}`}
                        className="p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg transition-colors flex-shrink-0"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
            <button
              onClick={() => setShowContactsModal(false)}
              className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* How To Bid Modal */}
      {showHowToBidModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background dark:bg-[#0f172a] bg-[#f8fafc] border border-card-border rounded-xl md:rounded-3xl p-4 md:p-8 max-w-2xl w-full shadow-2xl relative zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowHowToBidModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-card-border/50 text-foreground/50 hover:bg-card-border hover:text-foreground transition-all"
            >
              ✕
            </button>
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-primary/20">
              <Info className="w-8 h-8 text-brand-primary" />
            </div>

            <h2 className="text-2xl font-bold mb-6 text-center">How Bidding Works</h2>
            <div className="space-y-6 text-sm text-foreground/80 text-left">
              <div className="bg-foreground/5 p-4 rounded-xl">
                <h3 className="font-bold text-foreground mb-2">For Passengers: Creating Job Requests</h3>
                <p>When you need a ride or service, you can post a job request for drivers to bid on. Use the <strong>"Create Bid"</strong> button directly on any vehicle category page to post your request.</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Your VIP tier determines how many requests you can create (Non-VIP users get <strong>1 free request</strong> per month). Limits reset monthly.</li>
                  <li>Requests remain active for <strong>two weeks</strong> before automatically expiring.</li>
                  <li>If you delete your own bid, or if it expires without a driver being chosen, the bid limit is <strong>not</strong> returned to you.</li>
                </ul>
              </div>
              
              <div className="bg-foreground/5 p-4 rounded-xl">
                <h3 className="font-bold text-foreground mb-2">For Drivers: Bidding on Jobs</h3>
                <p>Find jobs by clicking <strong>"Bid for Job"</strong> on your driver dashboard, or by using the <strong>"Bid for jobs"</strong> button directly on any vehicle category page.</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Placing a bid consumes one of your available bids. (Non-VIP drivers receive <strong>1 free bid</strong> per month). Higher VIP levels grant more bids.</li>
                  <li>Bids reset completely at the start of each month (they do not roll over).</li>
                  <li>If a passenger deletes a job request you bid on, your bid count <strong>is returned</strong> to you.</li>
                </ul>
              </div>

              <div className="bg-foreground/5 p-4 rounded-xl">
                <h3 className="font-bold text-foreground mb-2">Disappointments & Reporting</h3>
                <p>If a passenger or driver cancels maliciously or disappoints:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Your consumed bid or request limit is <strong>not automatically returned</strong>.</li>
                  <li>You should <strong>report the user</strong> directly from their <strong>profile page</strong> or within the <strong>chat UI</strong> so the platform can take action.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHowToBidModal(false)}
              className="w-full mt-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
