import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "cart_session_id";

/**
 * POST /api/cart/merge — merge guest cookie cart into user DB cart
 * Called after login. Moves all cart items from sessionId to userId,
 * combining quantities for duplicate products.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      // No guest cart to merge
      return NextResponse.json({ merged: 0 });
    }

    // Find all guest cart items
    const guestItems = await prisma.cartItem.findMany({
      where: { sessionId },
    });

    if (guestItems.length === 0) {
      // Clear guest cookie
      const res = NextResponse.json({ merged: 0 });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    // Merge in a transaction to prevent race conditions
    const merged = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const guestItem of guestItems) {
        const existingUserItem = await tx.cartItem.findFirst({
          where: { userId, productId: guestItem.productId },
        });

        if (existingUserItem) {
          await tx.cartItem.update({
            where: { id: existingUserItem.id },
            data: { quantity: Math.min(existingUserItem.quantity + guestItem.quantity, 99) },
          });
        } else {
          await tx.cartItem.update({
            where: { id: guestItem.id },
            data: { userId, sessionId: null, quantity: Math.min(guestItem.quantity, 99) },
          });
        }
        count++;
      }
      return count;
    });

    // Clear guest cookie
    const res = NextResponse.json({ merged });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  } catch (error) {
    console.error("Failed to merge cart:", error);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
