"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, Star, MapPin, Car, Phone, ShieldOff, Heart, MessageCircle, AlertTriangle, Flag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import ChatButton from "@/components/ChatButton";
import { getVIPBadge } from "@/lib/constants";
import PassengerServicesModal from "@/components/PassengerServicesModal";
import ReportUserOverlay from "@/components/ReportUserOverlay";

export default function DriverProfilePage() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const autoOpenChat = searchParams.get("chat") === "open";

  const [driver, setDriver] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [viewingServicesFor, setViewingServicesFor] = useState<{id: string, name: string} | null>(null);
  const [showReportOverlay, setShowReportOverlay] = useState(false);

  useEffect(() => {
    const fetchDriverAndVehicles = async () => {
      try {
        const docRef = doc(db, "users", driverId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDriver(docSnap.data());
          
          const q = query(collection(db, "vehicles"), where("driverId", "==", driverId), where("isApproved", "==", true));
          const vSnap = await getDocs(q);
          const vData: any[] = [];
          vSnap.forEach(d => vData.push({ id: d.id, ...d.data() }));
          setVehicles(vData);

          // We remove the favorite check from here because user auth might not be resolved yet
        }
      } catch (err) {
        console.error("Error fetching driver profile:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (driverId) {
      fetchDriverAndVehicles();
    }
  }, [driverId]);

  // Separate useEffect for checking favorite status when user auth resolves
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (user && driverId) {
        try {
          const favRef = doc(db, "users", user.uid, "favorites", driverId);
          const favSnap = await getDoc(favRef);
          setIsFavorited(favSnap.exists());
        } catch (error) {
          console.error("Error checking favorite status:", error);
        }
      }
    };
    
    fetchFavoriteStatus();
  }, [user, driverId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Driver Not Found</h1>
        <button onClick={() => router.back()} className="text-brand-primary hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const renderStars = (rating: number = 5) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 md:w-5 md:h-5 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-foreground/20"}`}
      />
    ));
  };

  const hasActiveTicket = driver.ticketExpiry ? new Date(driver.ticketExpiry) > new Date() : false;
  const isOwnProfile = user?.uid === driverId;

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please sign in to like this driver");
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error("Login failed:", err);
      }
      return;
    }
    
    try {
      setIsTogglingFavorite(true);
      const favRef = doc(db, "users", user.uid, "favorites", driverId);
      const driverRef = doc(db, "users", driverId);

      if (isFavorited) {
        await deleteDoc(favRef);
        await updateDoc(driverRef, { favoriteCount: increment(-1) });
        setDriver({ ...driver, favoriteCount: Math.max(0, (driver.favoriteCount || 0) - 1) });
        setIsFavorited(false);
        toast.success("Removed from favorites");
      } else {
        await setDoc(favRef, { favoritedAt: new Date().toISOString() });
        await updateDoc(driverRef, { favoriteCount: increment(1) });
        setDriver({ ...driver, favoriteCount: (driver.favoriteCount || 0) + 1 });
        setIsFavorited(true);
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorites");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-6 pb-24 px-4 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 md:p-3 bg-card-bg hover:bg-card-border border border-card-border rounded-full transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold">Driver Profile</h1>
          </div>
          
          {user && !isOwnProfile && (
            <button
              onClick={() => setShowReportOverlay(true)}
              className="text-[10px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800/50"
              title="Report Driver"
            >
              <Flag className="w-3 h-3" />
              Report
            </button>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-8 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          <div className="relative w-32 h-32 md:w-48 md:h-48 flex-shrink-0">
            {getVIPBadge(driver.vipStars) && (
              <div className={`absolute -top-2 -right-2 z-10 px-2 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-lg ${getVIPBadge(driver.vipStars)?.colorClass}`}>
                {getVIPBadge(driver.vipStars)?.tag}
              </div>
            )}
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-brand-primary/20 bg-card-border shadow-xl">
              {driver.displayImage ? (
                <img src={driver.displayImage} alt={driver.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-5xl uppercase">
                  {driver.username?.charAt(0) || driver.firstName?.charAt(0) || "D"}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {driver.username || driver.firstName}
              {driver.vipStars >= 1 && driver.vipStars < 5 && (
                <span title="VIP Member"><Star className="w-5 h-5 md:w-6 md:h-6 text-amber-500 fill-amber-500" /></span>
              )}
              {driver.vipStars === 5 && (
                <span className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-black text-amber-500 bg-gradient-to-br from-slate-900 to-black px-3 py-1 rounded-full border border-slate-700 shadow-md uppercase tracking-wider">
                  ULTIMATE VIP <Star className="w-3 h-3 md:w-4 md:h-4 fill-amber-500" />
                </span>
              )}
            </h2>
            
            <div className="flex items-center justify-center md:justify-start gap-1 bg-card-border/50 px-3 py-1.5 rounded-full mb-4 w-max mx-auto md:mx-0">
              {renderStars(driver.rating || 5.0)}
              <span className="ml-2 font-bold text-sm">{(driver.rating || 5.0).toFixed(1)}</span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-center md:justify-start gap-2 text-foreground/80">
                <MapPin className="w-5 h-5 text-brand-primary" />
                <span>{driver.operatingCity || "City not set"}, {driver.operatingState || "State not set"}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 mt-4">
              {hasActiveTicket ? (
                <>
                  <a 
                    href={`tel:${driver.phone}`}
                    className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 transition-all hover:scale-105"
                    title="Call Driver"
                  >
                    <Phone className="w-5 h-5" /> 
                    <span className="hidden md:inline">Call Driver</span>
                  </a>
                  
                  {driver.whatsappEnabled && driver.phone && (
                    <a 
                      href={`https://wa.me/${driver.phone.startsWith('0') ? '234' + driver.phone.substring(1) : driver.phone.replace('+', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl shadow-lg hover:bg-[#128C7E] transition-all hover:scale-105"
                      title="WhatsApp"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.272-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                      <span className="hidden md:inline">WhatsApp</span>
                    </a>
                  )}
                </>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-800/50 text-foreground/50 font-medium rounded-xl border border-gray-200 dark:border-gray-700">
                  <ShieldOff className="w-4 h-4" />
                  <span className="text-sm">Contact info unavailable</span>
                </div>
              )}

              {!isOwnProfile && (
                <button
                  onClick={toggleFavorite}
                  disabled={isTogglingFavorite}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    isFavorited 
                      ? "bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-500/10 dark:border-rose-500/20" 
                      : "bg-card-bg border-card-border hover:bg-card-border"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`} />
                  <span className="font-bold">{driver.favoriteCount || 0}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
          <Car className="text-brand-secondary" /> Driver&apos;s Vehicles
        </h3>
        
        {vehicles.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-2xl">
            <p className="text-foreground/60">This driver doesn&apos;t have any approved vehicles yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vehicles.map(v => (
              <div key={v.id} className="glass-panel rounded-2xl overflow-hidden group hover:shadow-xl hover:shadow-brand-secondary/10 transition-all duration-300 flex flex-col">
                <div className="h-40 md:h-48 w-full bg-card-border relative overflow-hidden">
                  {v.images?.front ? (
                    <img
                      src={v.images.front}
                      alt={`${v.details.make} ${v.details.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/30">
                      <Car className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-sm capitalize">
                    {v.category}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold mb-1 truncate">{v.details.make} {v.details.model}</h3>
                  <p className="text-sm text-foreground/60 mb-4 border-b border-card-border pb-4 truncate">
                    Yr: {v.details.year} • Seats: {v.details.seats} • AC: {v.details.ac ? "Yes" : "No"}
                  </p>

                  <div className="mt-auto flex gap-2">
                    <button className="flex-1 py-3 text-[10px] md:text-sm bg-brand-secondary/10 hover:bg-brand-secondary text-brand-secondary hover:text-white font-medium rounded-xl transition-colors">
                      Request Ride
                    </button>
                    <button 
                      onClick={() => setViewingServicesFor({id: v.id, name: `${v.details.make} ${v.details.model}`})}
                      className="flex-1 py-3 text-[10px] md:text-sm bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white font-medium rounded-xl transition-colors"
                    >
                      Services
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user && !isOwnProfile && (
        <ChatButton 
          driverId={driverId} 
          driverName={driver.firstName || driver.username || "Driver"} 
          driverImage={driver.displayImage || ""} 
          driverTicketExpiry={driver.ticketExpiry}
          driverVipStars={driver.vipStars}
          autoOpen={autoOpenChat}
        />
      )}

      {viewingServicesFor && (
        <PassengerServicesModal
          vehicleId={viewingServicesFor.id}
          vehicleName={viewingServicesFor.name}
          driverId={driverId}
          onClose={() => setViewingServicesFor(null)}
        />
      )}

      {showReportOverlay && user && (
        <ReportUserOverlay 
          reportedUserId={driverId}
          reportedUserRole="driver"
          onClose={() => setShowReportOverlay(false)}
        />
      )}
    </div>
  );
}
