import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendEmail } from "@/lib/email";

// This is designed to be triggered by a Vercel Cron Job daily
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    
    // In Vercel, cron jobs send a Bearer token matching CRON_SECRET if configured.
    // If you don't have CRON_SECRET, you can disable this check or use a custom secret.
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const now = Date.now();
    const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;
    const fourDaysFromNow = now + 4 * 24 * 60 * 60 * 1000;

    // We look for drivers whose vipExpiry falls between 3 and 4 days from now
    // (Firestore only allows inequality filters on one field, so we check vipStars in JS)
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("users")
      .where("role", "==", "driver")
      .where("vipExpiry", ">=", threeDaysFromNow)
      .where("vipExpiry", "<", fourDaysFromNow)
      .get();

    let emailedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Only email if they actually have an active VIP
      if ((data.vipStars || 0) <= 0) continue;
      
      const email = data.email;
      if (email) {
        const daysLeft = Math.ceil((data.vipExpiry - now) / (1000 * 60 * 60 * 24));
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2 style="color: #4F46E5;">Your VIP Subscription is Expiring Soon!</h2>
            <p style="font-size: 16px; color: #333;">Hi ${data.firstName || "Driver"},</p>
            <p style="font-size: 16px; color: #333;">
              Your VIP status will expire in approximately <strong>${daysLeft} days</strong>.
            </p>
            <p style="font-size: 16px; color: #333;">
              When your VIP expires, your usage limits will be reduced and any vehicles or routes exceeding the base limit will be automatically deleted.
            </p>
            <div style="margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://nomocars.com'}/vip" style="background-color: #4F46E5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Renew VIP Now</a>
            </div>
            <p style="font-size: 14px; color: #777;">Thank you for driving with Nomo Cars!</p>
          </div>
        `;
        
        await sendEmail(email, "Urgent: VIP Expiring Soon", html);
        emailedCount++;
      }
    }

    // Now enforce expirations that have actually passed
    const expiredSnapshot = await adminDb.collection("users")
      .where("role", "==", "driver")
      .where("vipExpiry", "<", now)
      .get();

    let expiredCount = 0;
    
    // Fetch non-VIP limits to enforce
    const pricingDoc = await adminDb.collection("adminSettings").doc("pricing").get();
    const pricingData = pricingDoc.exists ? pricingDoc.data() : null;
    const defaultMaxCars = pricingData?.nonVipLimits?.maxCars || 1;
    
    const { enforceVehicleLimits } = await import("@/lib/enforceVehicleLimits");

    for (const doc of expiredSnapshot.docs) {
      const data = doc.data();
      // Only process if they currently have stars
      if ((data.vipStars || 0) > 0) {
        await adminDb.collection("users").doc(doc.id).update({
          vipStars: 0
        });
        
        // Enforce limits to suspend excess vehicles
        await enforceVehicleLimits(doc.id, defaultMaxCars);
        expiredCount++;
      }
    }

    // Now for Tickets (if applicable)
    // Similar query for ticketExpiry if you want to notify about tickets.
    const ticketSnapshot = await adminDb.collection("users")
      .where("role", "==", "driver")
      .where("ticketExpiry", ">=", threeDaysFromNow)
      .where("ticketExpiry", "<", fourDaysFromNow)
      .get();

    for (const doc of ticketSnapshot.docs) {
      const data = doc.data();
      const email = data.email;
      if (email) {
        const daysLeft = Math.ceil((data.ticketExpiry - now) / (1000 * 60 * 60 * 24));
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2 style="color: #4F46E5;">Your Driver Ticket is Expiring Soon!</h2>
            <p style="font-size: 16px; color: #333;">Hi ${data.firstName || "Driver"},</p>
            <p style="font-size: 16px; color: #333;">
              Your operating ticket will expire in approximately <strong>${daysLeft} days</strong>.
            </p>
            <p style="font-size: 16px; color: #333;">
              Please renew your ticket to avoid interruptions in your ability to operate on the platform.
            </p>
            <div style="margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://nomocars.com'}/driver/ticket" style="background-color: #4F46E5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Renew Ticket Now</a>
            </div>
            <p style="font-size: 14px; color: #777;">Thank you for driving with Nomo Cars!</p>
          </div>
        `;
        
        await sendEmail(email, "Reminder: Ticket Expiring Soon", html);
        emailedCount++;
      }
    }

    return NextResponse.json({ success: true, emailedCount });
  } catch (error) {
    console.error("Cron Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
