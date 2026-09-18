"use server";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface CreateRouteInput {
  driverId: string;
  vehicleId: string;
  startPoint: string;
  destination: string;
  price: string;
  description?: string;
  isNegotiable?: boolean;
}

export async function createRouteSecure(input: CreateRouteInput) {
  try {
    const adminDb = getAdminDb();
    const { driverId, vehicleId, startPoint, destination, price, description, isNegotiable } = input;

    // 1. Verify the user exists and is an approved driver
    const userDoc = await adminDb.collection("users").doc(driverId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User not found." };
    }

    const userData = userDoc.data();
    if (userData?.role !== "driver") {
      return { success: false, error: "Only drivers can add routes." };
    }

    if (!userData?.isApproved) {
      return { success: false, error: "Your driver account must be approved first." };
    }

    // 2. Verify the vehicle belongs to this driver
    const vehicleDoc = await adminDb.collection("vehicles").doc(vehicleId).get();
    if (!vehicleDoc.exists) {
      return { success: false, error: "Vehicle not found." };
    }

    const vehicleData = vehicleDoc.data();
    if (vehicleData?.driverId !== driverId) {
      return { success: false, error: "This vehicle does not belong to you." };
    }

    // 3. Get route limits from admin settings
    const vipStars = Number(userData.vipStars || 0);
    let maxRoutesPerCar = 1;

    const pricingDoc = await adminDb.collection("adminSettings").doc("pricing").get();
    if (pricingDoc.exists) {
      const pricing = pricingDoc.data();
      if (vipStars > 0 && pricing?.vip) {
        const tier = pricing.vip.find((v: any) => v.stars === vipStars);
        if (tier) {
          maxRoutesPerCar = tier.maxRoutesPerCar || 2;
        }
      } else if (pricing?.nonVipLimits) {
        maxRoutesPerCar = pricing.nonVipLimits.maxRoutesPerCar || 1;
      }
    }

    // 4. Check current route count for this vehicle
    const routesSnapshot = await adminDb
      .collection("vehicleServices")
      .where("vehicleId", "==", vehicleId)
      .get();

    if (routesSnapshot.size >= maxRoutesPerCar) {
      return {
        success: false,
        error: `Route limit reached (${maxRoutesPerCar}). ${vipStars < 1 ? "Upgrade to VIP to add more routes." : "Upgrade your VIP tier for more routes."}`,
      };
    }

    // 5. Validate required fields
    if (!startPoint || !destination || !price) {
      return { success: false, error: "Start point, destination, and price are required." };
    }

    // 6. Save the route
    await adminDb.collection("vehicleServices").add({
      driverId,
      vehicleId,
      startPoint,
      destination,
      price,
      description: description || "",
      isNegotiable: isNegotiable || false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error("Server createRouteSecure error:", err);
    return { success: false, error: "Server error. Please try again." };
  }
}
