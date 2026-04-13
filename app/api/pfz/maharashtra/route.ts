import { NextResponse } from "next/server";
import { getMaharashtraPfz } from "../../../../lib/pfz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getMaharashtraPfz();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load Maharashtra PFZ data.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
