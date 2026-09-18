import dbConnect from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    return Response.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Health] MongoDB connection failed:", error);

    return Response.json(
      {
        status: "error",
        database: "disconnected",
        message: error.message || "MongoDB connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
