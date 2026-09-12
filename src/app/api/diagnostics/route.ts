import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    envVarsPresent: {
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      FIREBASE_PRIVATE_KEY_STARTS_WITH: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) || "NOT SET",
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      FIREBASE_SERVICE_ACCOUNT_JSON: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      PAYSTACK_SECRET_KEY: !!process.env.PAYSTACK_SECRET_KEY,
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    },
    firebaseAdmin: { status: "not_tested" },
  };

  // Try importing and initializing Firebase Admin
  try {
    const { getAdminDb } = await import("@/lib/firebaseAdmin");
    const db = getAdminDb();
    // Try a simple read to verify credentials actually work
    const testDoc = await db.collection("adminSettings").doc("pricing").get();
    diagnostics.firebaseAdmin = {
      status: "success",
      testDocExists: testDoc.exists,
    };
  } catch (error: any) {
    diagnostics.firebaseAdmin = {
      status: "error",
      message: error.message,
      code: error.code || error.name,
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
