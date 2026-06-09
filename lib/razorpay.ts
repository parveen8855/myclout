interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  amount: number;
  currency: string;
  description: string;
  handler: (response: RazorpayPaymentResponse) => void;
  key: string;
  modal?: {
    ondismiss?: () => void;
  };
  name: string;
  order_id: string;
  prefill?: {
    email?: string;
    name?: string;
  };
  theme?: {
    color: string;
  };
}

interface RazorpayCheckout {
  open: () => void;
}

type RazorpayWindow = Window & {
  Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
};

export function loadRazorpayCheckout() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const razorpayWindow = window as RazorpayWindow;

    if (razorpayWindow.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), {
        once: true,
      });
      existingScript.addEventListener("error", () => resolve(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpay({
  amount,
  description,
  name,
  onDismiss,
  onSuccess,
  orderId,
  prefill,
}: {
  amount: number;
  description: string;
  name: string;
  onDismiss?: () => void;
  onSuccess: (
    paymentId: string,
    response: RazorpayPaymentResponse,
  ) => Promise<void> | void;
  orderId: string;
  prefill?: {
    email?: string;
    name?: string;
  };
}) {
  const loaded = await loadRazorpayCheckout();
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const razorpayWindow = window as RazorpayWindow;

  if (!loaded || !razorpayWindow.Razorpay) {
    throw new Error("Unable to load Razorpay checkout.");
  }

  if (!key) {
    throw new Error("Razorpay key is missing.");
  }

  const checkout = new razorpayWindow.Razorpay({
    amount: Math.round(amount * 100),
    currency: "INR",
    description,
    handler: (response) => {
      void onSuccess(response.razorpay_payment_id, response);
    },
    key,
    modal: {
      ondismiss: onDismiss,
    },
    name,
    order_id: orderId,
    prefill,
    theme: { color: "#f0c040" },
  });

  checkout.open();
}
