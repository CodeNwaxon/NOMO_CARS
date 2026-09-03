"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, Star, MapPin, Car, Phone } from "lucide-react";

export default function DriverProfilePage() {
  const params = useParams();
  const driverId = params.id as string;
  const router = useRouter();

  const [driver, setDriver] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-background pt-6 pb-24 px-4 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 md:p-3 bg-card-bg hover:bg-card-border border border-card-border rounded-full transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Driver Profile</h1>
        </div>

        <div className="glass-panel rounded-3xl p-8 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-brand-primary/20 bg-card-border shadow-xl flex-shrink-0">
            {driver.displayImage ? (
              <img src={driver.displayImage} alt={driver.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-5xl uppercase">
                {driver.username?.charAt(0) || driver.firstName?.charAt(0) || "D"}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 flex items-center justify-center md:justify-start gap-3">
              {driver.username || driver.firstName}
              {driver.vipStars >= 1 && <span title="VIP Member"><Star className="w-6 h-6 text-amber-500 fill-amber-500" /></span>}
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
            
            <a 
              href={`tel:${driver.phone}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 transition-all hover:scale-105"
            >
              <Phone className="w-5 h-5" /> Contact Driver
            </a>
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
          <Car className="text-brand-secondary" /> Driver's Vehicles
        </h3>
        
        {vehicles.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-2xl">
            <p className="text-foreground/60">This driver doesn't have any approved vehicles yet.</p>
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

                  <button className="mt-auto w-full py-3 text-sm bg-brand-secondary/10 hover:bg-brand-secondary text-brand-secondary hover:text-white font-medium rounded-xl transition-colors">
                    Request Ride
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
