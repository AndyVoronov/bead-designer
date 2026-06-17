import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { sendWaitlistNotifications } from "@/lib/waitlist-notify";

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId обязателен" }, { status: 400 });
    }

    const result = await sendWaitlistNotifications(Number(productId));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to send waitlist notifications:", error);
    return NextResponse.json({ error: "Ошибка отправки уведомлений" }, { status: 500 });
  }
}
