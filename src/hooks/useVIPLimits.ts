"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export interface VIPLimits {
  maxCars: number;
  maxRoutesPerCar: number;
  dailyBids: number;
  createBidLimit: number;
}

export function useVIPLimits(vipStars: number = 0) {
  const { profile } = useAuth();
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
        const pricingSnap = await getDoc(doc(db, "adminSettings", "pricing"));
        
        let finalLimits: VIPLimits = { maxCars: 1, maxRoutesPerCar: 1, dailyBids: 1, createBidLimit: 1 };

        if (pricingSnap.exists()) {
          const data = pricingSnap.data();
          let tierFound = false;
          
          if (vipStars > 0 && data.vip) {
            const tier = data.vip.find((v: any) => v.stars === vipStars);
            if (tier) {
              finalLimits = {
                maxCars: tier.maxCars ?? 2,
                maxRoutesPerCar: tier.maxRoutesPerCar ?? 2,
                dailyBids: tier.dailyBids ?? 3,
                createBidLimit: tier.createBidLimit ?? 3
              };
              tierFound = true;
            }
          }
          
          // Fallback to non-VIP limits
          if (!tierFound && data.nonVipLimits) {
            finalLimits = {
              maxCars: data.nonVipLimits.maxCars ?? 1,
              maxRoutesPerCar: data.nonVipLimits.maxRoutesPerCar ?? 1,
              dailyBids: data.nonVipLimits.dailyBids ?? 1,
              createBidLimit: data.nonVipLimits.createBidLimit ?? 1
            };
          }

          const ticketsStarted = data.startTicketCollection === true;
          if (!ticketsStarted) {
            finalLimits.dailyBids = Math.max(finalLimits.dailyBids, 3);
            finalLimits.createBidLimit = Math.max(finalLimits.createBidLimit, 3);
          } else if (profile?.createdAt) {
            const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
            if (Date.now() - profile.createdAt <= ninetyDaysMs) {
              finalLimits.dailyBids = Math.max(finalLimits.dailyBids, 2);
              finalLimits.createBidLimit = Math.max(finalLimits.createBidLimit, 2);
            }
          }
        }

        setLimits(finalLimits);
      } catch (error) {
        console.error("Failed to load VIP limits", error);
      } finally {
        setLoadingLimits(false);
      }
    };

    fetchLimits();
  }, [vipStars, profile?.createdAt]);

  return { limits, loadingLimits };
}
