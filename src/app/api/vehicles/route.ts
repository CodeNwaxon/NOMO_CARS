import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const driverId = searchParams.get("driverId");

    const adminDb = getAdminDb();
    let vehiclesQuery = adminDb.collection("vehicles").where("isApproved", "==", true);

    if (category) {
      vehiclesQuery = vehiclesQuery.where("category", "==", category);
    }
    if (driverId) {
      vehiclesQuery = vehiclesQuery.where("driverId", "==", driverId);
    }

    const snapshot = await vehiclesQuery.get();
    
    // Check ticket collection setting
    const pricingRef = await adminDb.collection("adminSettings").doc("pricing").get();
    let dynamicStartTicketCollection = true;
    let dynamicTicketCollectionStartedAt = null;

    if (pricingRef.exists) {
      const pData = pricingRef.data();
      if (pData?.startTicketCollection !== undefined) {
        dynamicStartTicketCollection = pData.startTicketCollection;
      }
      
      if (pData?.ticketCollectionStartedAt) {
        if (typeof pData.ticketCollectionStartedAt === 'object' && pData.ticketCollectionStartedAt._seconds) {
          dynamicTicketCollectionStartedAt = new Date(pData.ticketCollectionStartedAt._seconds * 1000).toISOString();
        } else if (typeof pData.ticketCollectionStartedAt === 'object' && typeof pData.ticketCollectionStartedAt.toDate === 'function') {
          dynamicTicketCollectionStartedAt = pData.ticketCollectionStartedAt.toDate().toISOString();
        } else {
          dynamicTicketCollectionStartedAt = new Date(pData.ticketCollectionStartedAt).toISOString();
        }
      }
    }

    const vehicles: any[] = [];
    const driverIds = new Set<string>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // CRITICAL SECURITY MEASURE:
      // Strip out the sensitive documents field before sending to client
      if (data.documents) {
        delete data.documents;
      }
      
      vehicles.push({ id: doc.id, ...data, services: [] });
      if (data.driverId) driverIds.add(data.driverId);
    });

    // Fetch drivers
    const driversMap: Record<string, any> = {};
    if (driverIds.size > 0) {
      const driverChunks = chunkArray(Array.from(driverIds), 10);
      await Promise.all(driverChunks.map(async (chunk) => {
        // Use document fetching directly or where in on __name__
        const dSnap = await adminDb.collection("users").where("__name__", "in", chunk).get();
        dSnap.forEach(doc => {
          driversMap[doc.id] = doc.data();
        });
      }));
    }

    // Fetch services
    const vehicleIds = vehicles.map(v => v.id);
    if (vehicleIds.length > 0) {
      const vChunks = chunkArray(vehicleIds, 10);
      await Promise.all(vChunks.map(async (chunk) => {
        const sSnap = await adminDb.collection("vehicleServices").where("vehicleId", "in", chunk).get();
        sSnap.forEach(doc => {
          const data = doc.data();
          const v = vehicles.find(vec => vec.id === data.vehicleId);
          if (v) v.services.push(data);
        });
      }));
    }

    // Merge drivers into vehicles
    vehicles.forEach(v => {
      const dData = driversMap[v.driverId] || {};
      v.driverCity = dData.operatingCity || "";
      v.driverState = dData.operatingState || "";
      v.driverVipStars = dData.vipStars || 0;
      v.driverName = dData.username || dData.firstName || "Unknown";
      v.driverIsDisabled = dData.isDisabled || false;
      v.driverTicketExpiry = dData.ticketExpiry || null;
      v.driverJobsWon = dData.jobsWon || 0;

      // Extract driverCreatedAt or createdAt for the personal 90-day ticket calculation
      let createdAtStr = null;
      const createdAtData = dData.driverCreatedAt || dData.createdAt;
      if (createdAtData) {
        if (typeof createdAtData === 'object' && createdAtData._seconds) {
          createdAtStr = new Date(createdAtData._seconds * 1000).toISOString();
        } else if (typeof createdAtData === 'object' && typeof createdAtData.toDate === 'function') {
          createdAtStr = createdAtData.toDate().toISOString();
        } else {
          createdAtStr = new Date(createdAtData).toISOString();
        }
      }
      v.driverCreatedAt = createdAtStr;
    });

    return NextResponse.json({ success: true, vehicles, dynamicStartTicketCollection, dynamicTicketCollectionStartedAt }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching vehicles API:", error);
    const isAdminInitError = error.message?.includes('Firebase Admin') || error.message?.includes('Missing Firebase Admin');
    return NextResponse.json(
      { 
        success: false, 
        error: isAdminInitError 
          ? "Server configuration error. Please contact support." 
          : (error.message || "Failed to fetch vehicles"),
        code: isAdminInitError ? "ADMIN_INIT_FAILED" : "FETCH_ERROR"
      },
      { status: 500 }
    );
  }
}
