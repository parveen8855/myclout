import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export const runtime = "nodejs";

function getSafeReceipt(receipt?: string) {
  const value = receipt?.trim() || `weclout_${Date.now()}`;

  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
}

export async function POST(request: Request) {
  try {
    const {
      amount,
      currency = "INR",
      receipt,
    } = (await request.json()) as {
      amount?: number;
      currency?: string;
      receipt?: string;
    };
    const amountInRupees = Number(amount);

    if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
      return NextResponse.json(
        { error: "A valid amount is required." },
        { status: 400 },
      );
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.log("create-order error: Razorpay environment keys are missing.");
      return NextResponse.json(
        { error: "Razorpay is not configured on the server." },
        { status: 500 },
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amountInRupees * 100),
      currency,
      receipt: getSafeReceipt(receipt),
    });

    return NextResponse.json({
      ...order,
      orderId: order.id,
    });
  } catch (error) {
    console.log("create-order error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create order.",
      },
      { status: 500 },
    );
  }
}
