import { NextRequest, NextResponse } from "next/server";
import { generateCloudinarySignature } from "@/lib/cloudinary";
import { requireInmobiliariaAuth, isNextResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const session = await requireInmobiliariaAuth();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") ?? "inmolibres";

  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = generateCloudinarySignature(params);

  return NextResponse.json({
    signature,
    timestamp,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder,
  });
}
