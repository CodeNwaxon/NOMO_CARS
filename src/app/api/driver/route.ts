import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get("id");

    if (!driverId) {
      return NextResponse.json({ success: false, error: "Driver ID is required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const docSnap = await adminDb.collection("users").doc(driverId).get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    const data = docSnap.data();

    // Check ticket validity for contact access (60 days rule)
    let hasContactAccess = false;
    try {
      const pricingRef = await adminDb.collection("adminSettings").doc("pricing").get();
      let startTicketCollection = true;
      let ticketCollectionStartedAt: Date = new Date();

      if (pricingRef.exists) {
        const pData = pricingRef.data();
        if (pData?.startTicketCollection !== undefined) {
          startTicketCollection = pData.startTicketCollection;
        }
        if (pData?.ticketCollectionStartedAt) {
          if (typeof pData.ticketCollectionStartedAt === 'object' && pData.ticketCollectionStartedAt._seconds) {
            ticketCollectionStartedAt = new Date(pData.ticketCollectionStartedAt._seconds * 1000);
          } else if (typeof pData.ticketCollectionStartedAt === 'object' && typeof pData.ticketCollectionStartedAt.toDate === 'function') {
            ticketCollectionStartedAt = pData.ticketCollectionStartedAt.toDate();
          } else {
            ticketCollectionStartedAt = new Date(pData.ticketCollectionStartedAt);
          }
        }
      }

      if (!startTicketCollection) {
        hasContactAccess = true;
      } else {
        if (data?.ticketExpiry) {
          let expiryDate: Date;
          if (typeof data.ticketExpiry === 'object' && data.ticketExpiry._seconds) {
            expiryDate = new Date(data.ticketExpiry._seconds * 1000);
          } else if (typeof data.ticketExpiry === 'object' && typeof data.ticketExpiry.toDate === 'function') {
            expiryDate = data.ticketExpiry.toDate();
          } else {
            expiryDate = new Date(data.ticketExpiry);
          }
          if (expiryDate > new Date()) hasContactAccess = true;
        }

        if (!hasContactAccess) {
          const createdAtData = data?.driverCreatedAt || data?.createdAt;
          let driverStart = ticketCollectionStartedAt;
          if (createdAtData) {
            if (typeof createdAtData === 'object' && createdAtData._seconds) {
              driverStart = new Date(createdAtData._seconds * 1000);
            } else if (typeof createdAtData === 'object' && typeof createdAtData.toDate === 'function') {
              driverStart = createdAtData.toDate();
            } else {
              driverStart = new Date(createdAtData);
            }
          }
          const effectiveStartDate = new Date(Math.max(driverStart.getTime(), ticketCollectionStartedAt.getTime()));
          // 60 days for contact access
          const contactFreePeriodEnd = new Date(effectiveStartDate.getTime() + 60 * 24 * 60 * 60 * 1000);
          if (new Date() < contactFreePeriodEnd) {
            hasContactAccess = true;
          }
        }
      }
    } catch (err) {
      console.error("Error evaluating contact ticket access:", err);
    }

    // Strip sensitive information
    if (data) {
      delete data.balance;
      delete data.walletBalance;
      delete data.withdrawalPin;
      delete data.authProvider;
    }

    return NextResponse.json({ success: true, driver: { id: docSnap.id, ...data, hasContactAccess } }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching driver API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch driver" },
      { status: 500 }
    );
  }
}
