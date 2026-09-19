import { NextRequest, NextResponse } from "next/server";
import { tuyaPost } from "@/lib/tuya";

export async function POST(req: NextRequest) {
  try {
    const id = process.env.TUYA_DEVICE_ID;
    if (!id) return NextResponse.json({error:"TUYA_DEVICE_ID is not configured."},{status:500});
    const body = await req.json();
    if (typeof body?.code !== "string") return NextResponse.json({error:"Invalid command code."},{status:400});
    const result = await tuyaPost(`/v1.0/iot-03/devices/${id}/commands`, {
      commands: [{ code: body.code, value: body.value }]
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({error:e instanceof Error ? e.message : "Tuya command failed"},{status:500});
  }
}