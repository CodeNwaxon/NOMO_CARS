import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";

export async function notifyAdminsClient(title: string, message: string, link: string) {
  try {
    const CEO_UID = process.env.NEXT_PUBLIC_ADMIN_UID || "xFAB29wQyBfGk4W2oLaD9qwxgfY2";
    const adminIds = new Set<string>([CEO_UID]);

    // Fetch from adminRoles
    const rolesSnap = await getDocs(collection(db, "adminRoles"));
    rolesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const routes = data.routes || [];
      if (
        routes.includes("all") ||
        routes.some((r: string) => r !== "/admin" && link.startsWith(r)) ||
        (link === "/admin" && routes.includes("/admin"))
      ) {
        adminIds.add(docSnap.id);
      }
    });

    // Send push notification to each admin
    const promises = Array.from(adminIds).map((adminId) => {
      return addDoc(collection(db, "user_notifications"), {
        userId: adminId,
        type: "approval",
        title,
        message,
        read: false,
        createdAt: Date.now(),
        link
      });
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error("Error notifying admins (client):", error);
    return false;
  }
}
