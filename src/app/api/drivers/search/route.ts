import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "40", 10);

    const qLower = query.toLowerCase();
    const adminDb = getAdminDb();

    // Check ticket collection setting
    const pricingRef = await adminDb.collection("adminSettings").doc("pricing").get();
    let dynamicStartTicketCollection = true;
    if (pricingRef.exists) {
      const pData = pricingRef.data();
      if (pData?.startTicketCollection !== undefined) {
        dynamicStartTicketCollection = pData.startTicketCollection;
      }
    }

    // Fetch all drivers to perform a substring search (since Firestore doesn't support substring search directly)
    // For large datasets, a 3rd party like Algolia is recommended.
    const snapshot = await adminDb.collection("users").where("role", "==", "driver").get();

    let matchedDrivers: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Skip disabled drivers
      if (data.isDisabled) {
        return;
      }

      // Check ticket validity if startTicketCollection is active
      if (dynamicStartTicketCollection) {
        const now = new Date().getTime();
        const expiry = data.ticketExpiry ? new Date(data.ticketExpiry).getTime() : 0;
        if (expiry <= now) {
          return; // Skip if ticket is expired or doesn't exist and collection is started
        }
      }

      const searchStr = `${data.username || ""} ${data.firstName || ""} ${data.lastName || ""} ${data.operatingState || ""} ${data.operatingCity || ""}`.toLowerCase();

      if (searchStr.includes(qLower)) {
        // Strip sensitive fields
        delete data.balance;
        delete data.walletBalance;
        delete data.withdrawalPin;
        delete data.authProvider;
        
        matchedDrivers.push({ id: doc.id, ...data });
      }
    });

    // Sort by VIP stars descending
    matchedDrivers.sort((a, b) => (b.vipStars || 0) - (a.vipStars || 0));

    const paginatedDrivers = matchedDrivers.slice(offset, offset + limit);
    const hasMore = offset + limit < matchedDrivers.length;

    return NextResponse.json({ 
      success: true, 
      drivers: paginatedDrivers,
      hasMore
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error searching drivers API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to search drivers" },
      { status: 500 }
    );
  }
}
