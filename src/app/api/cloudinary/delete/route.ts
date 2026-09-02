import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicIds } = body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return NextResponse.json({ error: "No public IDs provided" }, { status: 400 });
    }

    // Use cloudinary API to delete multiple assets
    const result = await cloudinary.api.delete_resources(publicIds);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error deleting Cloudinary resources:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
