"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ArrowLeft, Car } from "lucide-react";
import Link from "next/link";

export default function CategoryVehicles() {
  const params = useParams();
  const category = (params.category as string).replace("%20", " ");
  const router = useRouter();

  const getPluralCategory = (cat: string) => {
    if (!cat) return "";
    const lowerCat = cat.toLowerCase();
    if (lowerCat === "bus") return "buses";
    if (lowerCat.endsWith("s")) return cat + "es";
    return cat + "s";
  };

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryVehicles = async () => {
      try {
        const q = query(
          collection(db, "vehicles"),
          where("category", "==", category),
          where("isApproved", "==", true)
        );
        const querySnapshot = await getDocs(q);
        const fetchedVehicles: any[] = [];
        querySnapshot.forEach((doc) => {
          fetchedVehicles.push({ id: doc.id, ...doc.data() });
        });
        setVehicles(fetchedVehicles);
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
    <div className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-brand-secondary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto z-10 relative">
        <div className="flex items-center gap-4 mb-10">
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-brand-secondary animate-spin mb-4" />
            <p className="text-foreground/70">Loading available transports...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="glass-panel rounded-2xl md:p-12 p-6 text-center flex flex-col items-center max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-card-border/50 rounded-full flex items-center justify-center mb-4">
              <Car className="w-12 h-12 text-foreground/50" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Transports Found</h2>
            <p className="px-2 text-foreground/70 mb-6">
              No transport found choose another category
            </p>
            <Link
              href="/passenger"
              className="px-4 py-2 md:px-8 md:py-4 bg-brand-secondary text-sm md:text-base text-white font-medium rounded-lg md:rounded-xl hover:bg-brand-secondary/90 transition-colors shadow-lg shadow-brand-secondary/30"
            >
              Browse Other Categories
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.map((v) => (
              <div key={v.id} className="glass-panel rounded-3xl overflow-hidden group hover:shadow-xl hover:shadow-brand-secondary/10 transition-all duration-300">
                <div className="h-48 w-full bg-card-border relative overflow-hidden">
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
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    {v.details.seats} Seats
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">{v.details.make} {v.details.model}</h3>
                  <p className="text-sm text-foreground/60 mb-4 border-b border-card-border pb-4">
                    Year: {v.details.year} • AC: {v.details.ac ? "Yes" : "No"}
                  </p>

                  <button className="w-full py-3 bg-brand-secondary/10 hover:bg-brand-secondary text-brand-secondary hover:text-white font-medium rounded-xl transition-colors">
                    View Details
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
