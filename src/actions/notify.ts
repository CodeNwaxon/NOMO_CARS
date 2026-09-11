"use server";

import { sendEmail } from "@/lib/email";
import { getAdminDb } from "@/lib/firebaseAdmin"; // Ensure we use firebaseAdmin for server-side queries if needed

export async function sendApprovalEmail(userId: string, type: "driver" | "vehicle", itemName: string) {
  try {
    const db = getAdminDb();
    // We need the user's email. We can fetch it via Firebase Admin.
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return { success: false, error: "User not found" };
    
    const userData = userDoc.data();
    const email = userData?.email;
    if (!email) return { success: false, error: "User has no email" };

    const subject = type === "driver" 
      ? "Account Approved - Welcome to Nomo Cars!" 
      : "Vehicle Approved - Nomo Cars";

    const htmlContent = type === "driver" 
      ? `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Account Approved!</h1>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333;">Hello ${userData?.firstName || "Driver"},</p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">
              Great news! Your driver account on Nomo Cars has been successfully approved by our administrative team.
            </p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">
              You can now log in to your dashboard and start adding your vehicles to accept ride requests.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://nomocars.com'}/driver/dashboard" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
            </div>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Vehicle Approved!</h1>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333;">Hello ${userData?.firstName || "Driver"},</p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">
              Great news! Your vehicle <strong>${itemName}</strong> has been successfully reviewed and approved.
            </p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">
              It is now live on your profile and passengers can begin requesting rides and services from this vehicle.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://nomocars.com'}/driver/dashboard" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Vehicles</a>
            </div>
          </div>
        </div>
      `;

    await sendEmail(email, subject, htmlContent);
    return { success: true };
  } catch (error) {
    console.error("Error sending approval email:", error);
    return { success: false, error: String(error) };
  }
}

export async function notifyAdmins(title: string, message: string, link: string) {
  try {
    const db = getAdminDb();
    
    // 1. Get CEO
    const CEO_UID = process.env.NEXT_PUBLIC_ADMIN_UID || "xFAB29wQyBfGk4W2oLaD9qwxgfY2";
    const adminIds = new Set<string>([CEO_UID]);

    // 2. Get all other admins from adminRoles collection
    const adminRolesSnap = await db.collection("adminRoles").get();
    adminRolesSnap.forEach(doc => {
      const data = doc.data();
      const routes = data.routes || [];
      if (routes.includes("all") || routes.some((r: string) => link.startsWith(r))) {
        adminIds.add(doc.id);
      }
    });

    // 3. Send notification to all admins
    const batch = db.batch();
    const notificationsRef = db.collection("user_notifications");

    adminIds.forEach(adminId => {
      const newRef = notificationsRef.doc();
      batch.set(newRef, {
        userId: adminId,
        type: "approval",
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        link
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error notifying admins:", error);
    return { success: false, error: String(error) };
  }
}
