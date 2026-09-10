import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { hasValidTicket } from "@/lib/constants";

function normalizeSearchText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "40", 10);

    const qLower = normalizeSearchText(query);
    const adminDb = getAdminDb();

    // Check ticket collection setting
    const pricingRef = await adminDb.collection("adminSettings").doc("pricing").get();
    let dynamicStartTicketCollection = true;
    let ticketCollectionStartedAtStr: string | null = null;

    if (pricingRef.exists) {
      const pData = pricingRef.data();
      if (pData?.startTicketCollection !== undefined) {
        dynamicStartTicketCollection = pData.startTicketCollection;
      }
      if (pData?.ticketCollectionStartedAt) {
        if (typeof pData.ticketCollectionStartedAt === 'object' && pData.ticketCollectionStartedAt._seconds) {
          ticketCollectionStartedAtStr = new Date(pData.ticketCollectionStartedAt._seconds * 1000).toISOString();
        } else if (typeof pData.ticketCollectionStartedAt === 'object' && typeof pData.ticketCollectionStartedAt.toDate === 'function') {
          ticketCollectionStartedAtStr = pData.ticketCollectionStartedAt.toDate().toISOString();
        } else {
          ticketCollectionStartedAtStr = new Date(pData.ticketCollectionStartedAt).toISOString();
        }
      }
    }

    const searchTerms = qLower.split(" ").filter((term) => term.length >= 2);
    if (searchTerms.length === 0) {
      return NextResponse.json({ success: true, drivers: [], hasMore: false }, { status: 200 });
    }

    // Query indexed prefixes instead of scanning every user document.
    const candidateSnapshots = await Promise.all(
      searchTerms.map((term) => (
        adminDb.collection("users").where("searchTokens", "array-contains", term).get()
      ))
    );
    const candidates = new Map<string, Record<string, any>>();
    candidateSnapshots.forEach((snapshot) => {
      snapshot.forEach((driverDoc) => {
        candidates.set(driverDoc.id, driverDoc.data());
      });
    });

    const matchedDrivers: any[] = [];

    candidates.forEach((sourceData, id) => {
      const data = { ...sourceData };

      if (data.role !== "driver") {
        return;
      }

      // Skip disabled drivers
      if (data.isDisabled) {
        return;
      }

      // Check ticket validity using shared logic
      let expiryStr = null;
      if (data.ticketExpiry) {
        if (typeof data.ticketExpiry === 'object' && data.ticketExpiry._seconds) {
          expiryStr = new Date(data.ticketExpiry._seconds * 1000).toISOString();
        } else if (typeof data.ticketExpiry === 'object' && typeof data.ticketExpiry.toDate === 'function') {
          expiryStr = data.ticketExpiry.toDate().toISOString();
        } else {
          expiryStr = new Date(data.ticketExpiry).toISOString();
        }
      }

      // Extract driverCreatedAt or createdAt for the personal 90-day ticket calculation
      let createdAtStr = null;
      const createdAtData = data.driverCreatedAt || data.createdAt;
      if (createdAtData) {
        if (typeof createdAtData === 'object' && createdAtData._seconds) {
          createdAtStr = new Date(createdAtData._seconds * 1000).toISOString();
        } else if (typeof createdAtData === 'object' && typeof createdAtData.toDate === 'function') {
          createdAtStr = createdAtData.toDate().toISOString();
        } else {
          createdAtStr = new Date(createdAtData).toISOString();
        }
      }

      if (!hasValidTicket(expiryStr, dynamicStartTicketCollection, createdAtStr, ticketCollectionStartedAtStr)) {
        return; // Skip if ticket is not valid
      }

      const searchStr = normalizeSearchText(`${data.username || ""} ${data.firstName || ""} ${data.lastName || ""} ${data.operatingState || ""} ${data.operatingCity || ""}`);

      if (searchStr.includes(qLower)) {
        // Strip sensitive fields
        delete data.balance;
        delete data.walletBalance;
        delete data.withdrawalPin;
        delete data.authProvider;
        
        matchedDrivers.push({ id, ...data });
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
