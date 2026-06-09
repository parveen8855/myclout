import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface VerifyPaymentBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  userId?: string;
  amount?: number;
}

export async function POST(request: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = (await request.json()) as VerifyPaymentBody;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const digest = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (digest !== razorpay_signature) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    return NextResponse.json({ success: true, verified: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
