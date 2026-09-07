import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const { referrerId } = await request.json();

    if (!referrerId) {
      return NextResponse.json({ error: "referrerId is required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const referrerRef = adminDb.collection("users").doc(referrerId);
    
    // We run a transaction to safely read and update the referrer
    await adminDb.runTransaction(async (transaction) => {
      const referrerDoc = await transaction.get(referrerRef);
      if (!referrerDoc.exists) {
        throw new Error("Referrer does not exist");
      }

      const referrerData = referrerDoc.data()!;
      let currentPoints = referrerData.points || 0;
      currentPoints += 2;

      const pricingRef = adminDb.collection("adminSettings").doc("pricing");
      const pricingDoc = await transaction.get(pricingRef);
      let pointsPerStar = 20;
      let vipConfig: any[] = [];

      if (pricingDoc.exists) {
        const pData = pricingDoc.data()!;
        if (pData.pointsPerStar !== undefined) pointsPerStar = pData.pointsPerStar;
        if (pData.vip && Array.isArray(pData.vip)) vipConfig = pData.vip;
      }

      // Calculate earned stars based on total points
      let earnedStars = Math.floor(currentPoints / pointsPerStar);
      if (earnedStars > 5) earnedStars = 5;

      const updates: any = { points: currentPoints };

      if (earnedStars > 0) {
        const currentVipStars = referrerData.vipStars || 0;
        const currentExpiry = referrerData.vipExpiry || 0;
        const now = Date.now();
        
        // Find the duration for the earned star level
        const configForStar = vipConfig.find(v => v.stars === earnedStars);
        const durationDays = configForStar ? configForStar.durationDays : 30;

        // Upgrade them if they earned a new star OR if they earned a star they already had but it expired
        if (earnedStars > currentVipStars || (earnedStars === currentVipStars && currentExpiry < now)) {
          updates.vipStars = earnedStars;
          
          // Extend from current expiry if active, else from now
          const baseTime = currentExpiry > now ? currentExpiry : now;
          updates.vipExpiry = baseTime + (durationDays * 24 * 60 * 60 * 1000);
        }
      }

      transaction.update(referrerRef, updates);
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error processing referral:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
