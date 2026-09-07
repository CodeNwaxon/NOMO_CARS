"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface VIPLimits {
  maxCars: number;
  maxRoutesPerCar: number;
  dailyBids: number;
  createBidLimit: number;
}

export function useVIPLimits(vipStars: number = 0) {
  const [limits, setLimits] = useState<VIPLimits>({
    maxCars: 1,
    maxRoutesPerCar: 1,
    dailyBids: 1,
    createBidLimit: 1
  });
  const [loadingLimits, setLoadingLimits] = useState(true);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const pricingRef = doc(db, "adminSettings", "pricing");
        const snap = await getDoc(pricingRef);
        
        if (snap.exists()) {
          const data = snap.data();
          if (vipStars > 0 && data.vip) {
            const tier = data.vip.find((v: any) => v.stars === vipStars);
            if (tier) {
              setLimits({
                maxCars: tier.maxCars || 2,
                maxRoutesPerCar: tier.maxRoutesPerCar || 2,
                dailyBids: tier.dailyBids || 3,
                createBidLimit: tier.createBidLimit || 3
              });
              return;
            }
          }
          // Fallback to non-VIP limits
          if (data.nonVipLimits) {
            setLimits(data.nonVipLimits);
          }
        }
      } catch (error) {
        console.error("Failed to load VIP limits", error);
      } finally {
        setLoadingLimits(false);
      }
    };

    fetchLimits();
  }, [vipStars]);

  return { limits, loadingLimits };
}
