"use server";

import { sendEmail } from "@/lib/email";
import { websiteLink } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebaseAdmin";
export async function verifyAndNotifyPayment(
  reference: string, 
  userEmail: string, 
  userName: string, 
  purchaseType: string, 
  amountPaid: number
) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    
    if (!paystackSecret) {
      console.warn("Missing PAYSTACK_SECRET_KEY. Skipping strict verification.");
    } else {
      // Verify transaction with Paystack
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      });

      const data = await response.json();

      if (!data.status || data.data.status !== "success") {
        throw new Error("Payment verification failed at Paystack");
      }
    }
    
    // Construct email content
    
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #f7b731; padding: 20px; text-align: center;">
          <h2 style="color: #fff; margin: 0;">Payment Successful</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${userName || 'User'},</p>
          <p>Your payment for <strong>${purchaseType}</strong> was successful!</p>
          <p>Amount paid: ₦${amountPaid.toLocaleString()}</p>
          <p>Reference: ${reference}</p>
          <p>Your account has been updated with your new benefits.</p>
          <br/>
          <div style="text-align: center; margin-top: 20px; margin-bottom: 20px;">
            <a href="${websiteLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Return to Dashboard
            </a>
          </div>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          &copy; ${new Date().getFullYear()} Nomo Cars. All rights reserved.
        </div>
      </div>
    `;

    // Send email using the existing utility
    if (userEmail) {
      await sendEmail(userEmail, `${purchaseType} - Payment Successful`, htmlContent);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Payment Verification Error:", error);
    return { success: false, error: error.message };
  }
}

export async function simulateWebhookForLocalhost(
  metadata: any,
  amountInKobo: number,
  reference: string,
  userEmail: string
) {
  if (process.env.NODE_ENV !== "development") {
    console.log("Not in dev mode, skipping webhook simulation");
    return { success: true };
  }

  try {
    const adminDb = getAdminDb();
    const userId = metadata.userId;

    if (!userId) {
      throw new Error("Missing userId in metadata");
    }

    const userRef = adminDb.collection("users").doc(userId);

    if (metadata.planType === "vip") {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 180);

      await userRef.update({
        vipStars: metadata.planStars,
        vipExpiry: expiryDate.toISOString(),
      });
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
    const transactionRef = adminDb.collection("transactions").doc(reference);
    await transactionRef.set({
      userId,
      amount: amountInKobo / 100,
      type: metadata.planType || "unknown",
      reference: reference,
      createdAt: new Date().toISOString(),
      userEmail: userEmail || "",
    }, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.error("Localhost Webhook Simulation Error:", err);
    return { success: false, error: err.message };
  }
}
