import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyAndNotifyPayment } from "@/actions/payment";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ message: "No signature provided" }, { status: 400 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error("PAYSTACK_SECRET_KEY is missing");
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }

    const hash = crypto
      .createHmac("sha512", paystackSecret)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const { data } = event;
      const metadata = data.metadata || {};
      const userId = metadata.userId;

      if (!userId) {
        console.error("No userId in metadata", data.reference);
        return NextResponse.json({ message: "Missing userId in metadata" }, { status: 400 });
      }

      const adminDb = getAdminDb();
      const userRef = adminDb.collection("users").doc(userId);

      if (metadata.planType === "vip") {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 180); // Alternatively, pull from metadata if passed

        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};
        const oldStars = userData.vipStars || 0;

        await userRef.update({
          vipStars: metadata.planStars,
          vipExpiry: expiryDate.toISOString(),
        });

        // Enforce vehicle limits on ANY VIP purchase (upgrade or downgrade)
        const pricingDoc = await adminDb.collection("adminSettings").doc("pricing").get();
        const pricingData = pricingDoc.exists ? pricingDoc.data() : null;
        let newMaxCars = 1; // Default
        
        if (pricingData && pricingData.vip) {
          const configForStar = pricingData.vip.find((v: any) => v.stars === metadata.planStars);
          if (configForStar && configForStar.maxCars) {
            newMaxCars = configForStar.maxCars;
          }
        } else if (pricingData && pricingData.nonVipLimits) {
          newMaxCars = pricingData.nonVipLimits.maxCars;
        }

        // Import and run enforcement helper
        const { enforceVehicleLimits } = await import("@/lib/enforceVehicleLimits");
        await enforceVehicleLimits(userId, newMaxCars);
      } else if (metadata.planType === "ticket") {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + metadata.planDays);

        await userRef.update({
          ticketExpiry: expiryDate.toISOString(),
          lastTicketPrice: metadata.planPrice,
          lastTicketDays: metadata.planDays,
        });
      }

      // Log transaction
      const transactionRef = adminDb.collection("transactions").doc(data.reference);
      await transactionRef.set({
        userId,
        amount: data.amount / 100,
        type: metadata.planType || "unknown", // 'ticket' or 'vip'
        reference: data.reference,
        createdAt: new Date().toISOString(),
        userEmail: data.customer.email || "",
      }, { merge: true });

      // Also trigger the email verification via server action
      // We pass the data we need. We might need the user's name and email from Firestore if not in metadata
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      
      const userEmail = data.customer.email || userData?.email;
      const userName = userData?.username || userData?.firstName || "User";

      // Use a background task so we can return 200 immediately to Paystack
      verifyAndNotifyPayment(
        data.reference,
        userEmail,
        userName,
        metadata.planName || "Purchase",
        data.amount / 100 // Convert kobo to Naira
      ).catch(err => console.error("Error in verifyAndNotifyPayment:", err));

    }

    return NextResponse.json({ message: "Webhook received successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
