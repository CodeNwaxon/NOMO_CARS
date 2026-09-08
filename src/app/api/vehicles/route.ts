import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

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
    
    const vehicles: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // CRITICAL SECURITY MEASURE:
      // Strip out the sensitive documents field before sending to client
      if (data.documents) {
        delete data.documents;
      }
      
      vehicles.push({ id: doc.id, ...data });
    });

    return NextResponse.json({ success: true, vehicles }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching vehicles API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}
