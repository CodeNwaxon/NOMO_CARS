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

    // Strip sensitive information
    if (data) {
      delete data.balance;
      delete data.walletBalance;
      delete data.withdrawalPin;
      delete data.authProvider;
    }

    return NextResponse.json({ success: true, driver: { id: docSnap.id, ...data } }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching driver API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch driver" },
      { status: 500 }
    );
  }
}
