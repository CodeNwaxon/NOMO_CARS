export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "nomo cars";

  if (!cloudName || !apiKey) {
    throw new Error("Cloudinary configuration is missing");
  }

  try {
    // 1. Prepare parameters for signing
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const paramsToSign = {
      timestamp,
      upload_preset: uploadPreset,
    };

    // 2. Fetch signature from our secure backend endpoint
    const signResponse = await fetch("/api/cloudinary/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paramsToSign }),
    });

    if (!signResponse.ok) {
      throw new Error("Failed to get secure upload signature from backend");
    }

    const { signature } = await signResponse.json();

    // 3. Append all required fields for a Signed Upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("upload_preset", uploadPreset);

    // 4. Upload to Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudinary error details:", errorText);
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

export const extractPublicId = (url: string): string | null => {
  if (!url.includes("cloudinary.com")) return null;
  
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    
    const path = parts[1];
    const pathParts = path.split("/");
    
    // Remove the version string if it exists (starts with 'v' followed by numbers)
    if (pathParts[0].match(/^v\d+$/)) {
      pathParts.shift();
    }
    
    const fullPath = pathParts.join("/");
    const lastDotIndex = fullPath.lastIndexOf(".");
    
    if (lastDotIndex !== -1) {
      return fullPath.substring(0, lastDotIndex);
    }
    return fullPath;
  } catch (error) {
    return null;
  }
};

export const deleteImagesFromCloudinary = async (urls: string[]): Promise<boolean> => {
  const publicIds = urls
    .map(extractPublicId)
    .filter((id): id is string => id !== null);

  if (publicIds.length === 0) return true;

  try {
    const response = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicIds }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error calling Cloudinary deletion API:", error);
    return false;
  }
};
