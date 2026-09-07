"use server";

import { getAdminDb } from "@/lib/firebaseAdmin";

export async function enforceDriverLimits(driverId: string) {
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection("users").doc(driverId).get();
    if (!userDoc.exists) return { success: false, reason: "No user" };

    const data = userDoc.data();
    if (data?.role !== "driver") return { success: true, reason: "Not driver" };

    const now = Date.now();
    let currentVipStars = data.vipStars || 0;
    
    // Check if VIP expired
    if (data.vipExpiry && data.vipExpiry < now && currentVipStars > 0) {
      await adminDb.collection("users").doc(driverId).update({
        vipStars: 0,
        vipExpiry: null
      });
      currentVipStars = 0;
    }

    // Now, get the limits for currentVipStars
    const pricingDoc = await adminDb.collection("adminSettings").doc("pricing").get();
    let maxCars = 1;
    let maxRoutesPerCar = 1;

    if (pricingDoc.exists) {
      const pricing = pricingDoc.data();
      if (currentVipStars > 0 && pricing?.vip) {
        const tier = pricing.vip.find((v: any) => v.stars === currentVipStars);
        if (tier) {
          maxCars = tier.maxCars || 2;
          maxRoutesPerCar = tier.maxRoutesPerCar || 2;
        }
      } else if (pricing?.nonVipLimits) {
        maxCars = pricing.nonVipLimits.maxCars || 1;
        maxRoutesPerCar = pricing.nonVipLimits.maxRoutesPerCar || 1;
      }
    }

    // Enforce Vehicles Limit
    const vehiclesSnapshot = await adminDb.collection("vehicles")
      .where("driverId", "==", driverId)
      .get();
    
    let activeVehicles = vehiclesSnapshot.docs;

    if (activeVehicles.length > maxCars) {
      // Sort oldest first
      let sorted = activeVehicles.sort((a, b) => {
        const tA = a.data().createdAt?.toMillis?.() || 0;
        const tB = b.data().createdAt?.toMillis?.() || 0;
        return tA - tB; 
      });

      const toDeleteCount = sorted.length - maxCars;
      const toDeleteDocs = sorted.slice(0, toDeleteCount);
      activeVehicles = sorted.slice(toDeleteCount); // Keep the newest

      for (const vDoc of toDeleteDocs) {
        await adminDb.collection("vehicles").doc(vDoc.id).delete();
        
        // Delete associated services
        const svcSnap = await adminDb.collection("vehicleServices").where("vehicleId", "==", vDoc.id).get();
        if (!svcSnap.empty) {
            const batch = adminDb.batch();
            svcSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
      }
    }

    // Enforce Routes Limit for remaining vehicles
    for (const vDoc of activeVehicles) {
      const svcs = await adminDb.collection("vehicleServices")
        .where("vehicleId", "==", vDoc.id)
        .get();
      
      if (svcs.docs.length > maxRoutesPerCar) {
        let sortedSvcs = svcs.docs.sort((a, b) => {
            const tA = a.data().createdAt?.toMillis?.() || 0;
            const tB = b.data().createdAt?.toMillis?.() || 0;
            return tA - tB; 
        });

        const svcToDelete = sortedSvcs.length - maxRoutesPerCar;
        const docsToDelete = sortedSvcs.slice(0, svcToDelete);

        if (docsToDelete.length > 0) {
            const batch = adminDb.batch();
            docsToDelete.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Enforcement Error:", err);
    return { success: false, error: String(err) };
  }
}
