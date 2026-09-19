import { NextResponse } from "next/server";
import { tuyaGet } from "@/lib/tuya";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const id = process.env.TUYA_DEVICE_ID;
    if (!id) return NextResponse.json({error:"TUYA_DEVICE_ID is not configured."},{status:500});
    const result = await tuyaGet(`/v1.0/iot-03/devices/${id}/status`);
    return NextResponse.json({ status: result.result ?? [], online: result.success !== false });
  } catch (e) {
    return NextResponse.json({error:e instanceof Error ? e.message : "Tuya request failed"},{status:500});
  }
}