import { NextResponse } from "next/server";
import { pollRender } from "@/services/render";

export async function GET(
  _request: Request,
  context: { params: Promise<{ renderJobId: string }> },
) {
  try {
    const { renderJobId } = await context.params;
    const result = await pollRender(renderJobId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Could not get render status." }, { status: 500 });
  }
}
