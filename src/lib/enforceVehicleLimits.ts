import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * Enforces a user's vehicle limit by suspending excess vehicles.
 * Sorts vehicles by createdAt (oldest first - we keep the oldest active, suspend the newest).
 */
export async function enforceVehicleLimits(userId: string, maxCars: number) {
  try {
    const adminDb = getAdminDb();
    
    // Fetch all vehicles for this driver
    const vehiclesSnapshot = await adminDb.collection("vehicles")
      .where("driverId", "==", userId)
      .get();
      
    if (vehiclesSnapshot.empty) {
      return;
    }

    // Convert to array and sort by createdAt ASCENDING (oldest first)
    const vehicles = vehiclesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB; // Ascending
    });

    const batch = adminDb.batch();
    let updatesCount = 0;

    // The first `maxCars` elements are the oldest and should be active.
    // The rest are excess and should be suspended.
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle: any = vehicles[i];
      const shouldBeSuspended = i >= maxCars;
      
      // Only update if the flag is incorrect to save writes
      if (vehicle.isSuspendedByLimit !== shouldBeSuspended) {
        batch.update(adminDb.collection("vehicles").doc(vehicle.id), {
          isSuspendedByLimit: shouldBeSuspended
        });
        updatesCount++;
      }
    }

    if (updatesCount > 0) {
      await batch.commit();
      console.log(`Enforced vehicle limits for user ${userId}. Updated ${updatesCount} vehicles.`);
    }
  } catch (error) {
    console.error(`Error enforcing vehicle limits for user ${userId}:`, error);
  }
}
