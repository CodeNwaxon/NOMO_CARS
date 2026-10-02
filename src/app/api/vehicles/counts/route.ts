import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const adminDb = getAdminDb();

    // Fetch all approved vehicles
    const snapshot = await adminDb.collection("vehicles").where("isApproved", "==", true).get();

    // Get ticket collection settings
    const pricingRef = await adminDb.collection("adminSettings").doc("pricing").get();
    let startTicketCollection = true;
    let ticketCollectionStartedAt: Date | null = null;

    if (pricingRef.exists) {
      const pData = pricingRef.data();
      if (pData?.startTicketCollection !== undefined) {
        startTicketCollection = pData.startTicketCollection;
      }
      if (pData?.ticketCollectionStartedAt) {
        if (typeof pData.ticketCollectionStartedAt === 'object' && typeof pData.ticketCollectionStartedAt.toDate === 'function') {
          ticketCollectionStartedAt = pData.ticketCollectionStartedAt.toDate();
        } else if (typeof pData.ticketCollectionStartedAt === 'object' && pData.ticketCollectionStartedAt._seconds) {
          ticketCollectionStartedAt = new Date(pData.ticketCollectionStartedAt._seconds * 1000);
        } else {
          ticketCollectionStartedAt = new Date(pData.ticketCollectionStartedAt);
        }
      }
    }

    // Collect driver IDs to check validity
    const driverIds = new Set<string>();
    const vehiclesByCategory: Record<string, any[]> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const cat = data.category || "";
      if (!vehiclesByCategory[cat]) vehiclesByCategory[cat] = [];
      vehiclesByCategory[cat].push({ id: doc.id, ...data });
      if (data.driverId) driverIds.add(data.driverId);
    });

    // Fetch drivers in chunks
    const driversMap: Record<string, any> = {};
    if (driverIds.size > 0) {
      const driverArr = Array.from(driverIds);
      const chunks = [];
      for (let i = 0; i < driverArr.length; i += 10) {
        chunks.push(driverArr.slice(i, i + 10));
      }
      await Promise.all(chunks.map(async (chunk) => {
        const dSnap = await adminDb.collection("users").where("__name__", "in", chunk).get();
        dSnap.forEach(doc => {
          driversMap[doc.id] = doc.data();
        });
      }));
    }

    // Check which vehicles have services (routes)
    const allVehicleIds = snapshot.docs.map(d => d.id);
    const vehiclesWithServices = new Set<string>();
    if (allVehicleIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < allVehicleIds.length; i += 10) {
        chunks.push(allVehicleIds.slice(i, i + 10));
      }
      await Promise.all(chunks.map(async (chunk) => {
        const sSnap = await adminDb.collection("vehicleServices").where("vehicleId", "in", chunk).get();
        sSnap.forEach(doc => {
          vehiclesWithServices.add(doc.data().vehicleId);
        });
      }));
    }

    // Count valid vehicles per category
    const counts: Record<string, number> = {};

    const now = new Date();
    for (const [cat, vehicles] of Object.entries(vehiclesByCategory)) {
      let count = 0;
      for (const v of vehicles) {
        const driver = driversMap[v.driverId] || {};

        // Skip disabled or suspended drivers
        if (driver.isDisabled || v.isSuspendedByLimit) continue;

        // Must have at least one route/service
        if (!vehiclesWithServices.has(v.id)) continue;

        // Check ticket validity
        if (startTicketCollection) {
          const ticketExpiry = driver.ticketExpiry;
          if (ticketExpiry) {
            let expiryDate: Date;
            if (typeof ticketExpiry === 'object' && typeof ticketExpiry.toDate === 'function') {
              expiryDate = ticketExpiry.toDate();
            } else if (typeof ticketExpiry === 'object' && ticketExpiry._seconds) {
              expiryDate = new Date(ticketExpiry._seconds * 1000);
            } else {
              expiryDate = new Date(ticketExpiry);
            }
            if (expiryDate > now) { count++; continue; }
          }

          // Check personal 90-day grace period
          const createdAt = driver.driverCreatedAt || driver.createdAt;
          if (createdAt) {
            let createdDate: Date;
            if (typeof createdAt === 'object' && typeof createdAt.toDate === 'function') {
              createdDate = createdAt.toDate();
            } else if (typeof createdAt === 'object' && createdAt._seconds) {
              createdDate = new Date(createdAt._seconds * 1000);
            } else {
              createdDate = new Date(createdAt);
            }

            // If ticket collection started after driver was created, use that as the start
            const effectiveStart = ticketCollectionStartedAt && ticketCollectionStartedAt > createdDate
              ? ticketCollectionStartedAt
              : createdDate;

            const gracePeriodEnd = new Date(effectiveStart.getTime() + 90 * 24 * 60 * 60 * 1000);
            if (now < gracePeriodEnd) { count++; continue; }
          }
        } else {
          // Ticket collection not started — all approved vehicles are valid
          count++;
        }
      }
      counts[cat] = count;
    }

    return NextResponse.json({ success: true, counts }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching vehicle counts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch counts" },
      { status: 500 }
    );
  }
}
