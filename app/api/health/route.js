import { createResponse, createError, handleApiRequest } from "@/lib/api";
import dbConnect from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleApiRequest(async () => {
    await dbConnect();

    return createResponse(
      {
        status: "ok",
        service: "AGC Manual ERP API",
        version: "0.1.0",
        timestamp: new Date().toISOString(),
      },
      "API is running"
    );
  });
}
