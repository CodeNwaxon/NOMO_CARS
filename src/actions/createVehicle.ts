"use server";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface CreateVehicleInput {
  userId: string;
  category: string;
  details: Record<string, any>;
  documents: Record<string, string>;
  images: Record<string, string>;
}

export async function createVehicleSecure(input: CreateVehicleInput) {
  try {
    const adminDb = getAdminDb();
    const { userId, category, details, documents, images } = input;

    // 1. Verify the user exists and is an approved driver
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return { success: false, error: "User not found." };
    }

    const userData = userDoc.data();
    if (userData?.role !== "driver") {
      return { success: false, error: "Only approved drivers can add vehicles." };
    }

    if (!userData?.isApproved) {
      return { success: false, error: "Your driver account must be approved first." };
    }

    // 2. Get VIP status and limits from admin settings
    const vipStars = Number(userData.vipStars || 0);
    let maxCars = 1;

    const pricingDoc = await adminDb.collection("adminSettings").doc("pricing").get();
    if (pricingDoc.exists) {
      const pricing = pricingDoc.data();
      if (vipStars > 0 && pricing?.vip) {
        const tier = pricing.vip.find((v: any) => v.stars === vipStars);
        if (tier) {
          maxCars = tier.maxCars || 2;
        }
      } else if (pricing?.nonVipLimits) {
        maxCars = pricing.nonVipLimits.maxCars || 1;
      }
    }

    // 3. Check current vehicle count
    const vehiclesSnapshot = await adminDb
      .collection("vehicles")
      .where("driverId", "==", userId)
      .get();

    if (vehiclesSnapshot.size >= maxCars) {
      return {
        success: false,
        error: `You have reached your vehicle limit (${maxCars}). ${vipStars < 1 ? "Upgrade to VIP to add more." : "Upgrade your VIP tier for a higher limit."}`,
      };
    }

    // 4. Check for duplicate plate/registration number
    const plateNumber = details.plateNumber?.trim().toUpperCase();
    const registrationNumber = details.registrationNumber?.trim().toUpperCase();

    if (plateNumber) {
      const plateVariants = [plateNumber, plateNumber.toLowerCase()];
      const qPlate = await adminDb
        .collection("vehicles")
        .where("details.plateNumber", "in", plateVariants)
        .get();
      const hasDuplicate = qPlate.docs.some((d) => d.data().category === category);
      if (hasDuplicate) {
        return { success: false, error: `A ${category} with this plate number already exists.` };
      }
    }

    if (registrationNumber) {
      const regVariants = [registrationNumber, registrationNumber.toLowerCase()];
      const qReg = await adminDb
        .collection("vehicles")
        .where("details.registrationNumber", "in", regVariants)
        .get();
      const hasDuplicate = qReg.docs.some((d) => d.data().category === category);
      if (hasDuplicate) {
        return { success: false, error: `A ${category} with this registration number already exists.` };
      }
    }

    // 5. Build vehicle data
    const vehicleData = {
      driverId: userId,
      category,
      details,
      documents,
      images,
      isApproved: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    // 6. Save — non-VIPs use their userId as doc ID (enforces single vehicle), VIPs get auto-ID
    if (vipStars < 1) {
      await adminDb.collection("vehicles").doc(userId).set(vehicleData);
    } else {
      await adminDb.collection("vehicles").add(vehicleData);
    }

    return { success: true };
  } catch (err) {
    console.error("Server createVehicleSecure error:", err);
    return { success: false, error: "Server error. Please try again." };
  }
}
