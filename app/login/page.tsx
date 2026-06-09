"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase";
import { createUserDoc, getUserDoc } from "@/lib/firestore";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

type EmailMode = "login" | "signup";

const inputClassName =
  "w-full rounded-lg border border-white/[0.08] bg-[#1a1a24] px-3 py-3 text-white outline-none transition placeholder:text-[#444455] focus:border-[#7c6af7]";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-[#444455]">
      <div className="h-px flex-1 bg-white/10" />
      <span>or</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function getFirebaseAuthMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : "Authentication failed.";
  }

  switch (error.code) {
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "No account found.";
    case "auth/wrong-password":
      return "Wrong password.";
    case "auth/email-already-in-use":
      return "Email is already registered.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/invalid-verification-code":
      return "Wrong OTP. Please try again.";
    case "auth/missing-verification-code":
      return "Enter the OTP sent to your phone.";
    default:
      return error.message;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildIndiaPhoneNumber(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.startsWith("+")) {
    return trimmedValue.replace(/\s/g, "");
  }

  return `+91${trimmedValue.replace(/\D/g, "")}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  async function routeAfterAuth(
    uid: string,
    newUserData?: Record<string, unknown>,
  ) {
    const userDoc = await getUserDoc(uid);

    if (!userDoc && newUserData) {
      await createUserDoc(uid, newUserData);
      router.push("/onboarding");
      return;
    }

    router.push(userDoc ? "/dashboard" : "/onboarding");
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const { user } = result;

      await routeAfterAuth(user.uid, {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        state: "",
        district: "",
        isAnonymous: false,
        totalDonated: 0,
        currentWeekDonated: 0,
        streak: 0,
        badges: [],
        createdAt: new Date(),
      });
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleEmailSignup() {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setEmailLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password,
      );

      await routeAfterAuth(result.user.uid, {
        name: cleanEmail.split("@")[0],
        email: cleanEmail,
        photoURL: "",
        state: "",
        district: "",
        isAnonymous: false,
        totalDonated: 0,
        currentWeekDonated: 0,
        streak: 0,
        badges: [],
        createdAt: new Date(),
      });
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error));
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleEmailLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (!password) {
      toast.error("Enter your password.");
      return;
    }

    setEmailLoading(true);

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password,
      );

      await routeAfterAuth(result.user.uid);
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error));
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (emailMode === "signup") {
      await handleEmailSignup();
      return;
    }

    await handleEmailLogin();
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      toast.error("Enter your email first.");
      return;
    }

    setEmailLoading(true);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error));
    } finally {
      setEmailLoading(false);
    }
  }

  async function getRecaptchaVerifier() {
    if (!window.recaptchaVerifier) {
      // Make sure Phone Auth is enabled in Firebase Console > Authentication > Sign-in providers.
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        },
      );
    }

    return window.recaptchaVerifier;
  }

  async function handleSendOTP() {
    const phoneNumber = buildIndiaPhoneNumber(phone);
    const digits = phoneNumber.replace(/\D/g, "");

    if (!phoneNumber.startsWith("+") || digits.length < 10) {
      toast.error("Enter a valid phone number.");
      return;
    }

    setOtpLoading(true);

    try {
      const verifier = await getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);

      setConfirmationResult(result);
      setCountdown(60);
      toast.success("OTP sent!");
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error));
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!confirmationResult) {
      toast.error("Send OTP first.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }

    const phoneNumber = buildIndiaPhoneNumber(phone);
    setVerifyLoading(true);

    try {
      const result = await confirmationResult.confirm(otp.trim());

      await routeAfterAuth(result.user.uid, {
        name: `User${phoneNumber.slice(-4)}`,
        phone: phoneNumber,
        photoURL: "",
        state: "",
        district: "",
        isAnonymous: false,
        totalDonated: 0,
        currentWeekDonated: 0,
        streak: 0,
        badges: [],
        createdAt: new Date(),
      });
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error));
    } finally {
      setVerifyLoading(false);
    }
  }

  const isEmailSignup = emailMode === "signup";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111118] px-4 sm:px-6 py-10">
      <section className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-white">We</span>
            <span className="text-[#f0c040]">Clout</span>
          </h1>
          <p className="mt-3 text-sm text-[#888899]">
            Your Region. Your Clout.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <button
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-white py-3 font-semibold text-[#111118] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={googleLoading}
            onClick={handleGoogleLogin}
            type="button"
          >
            <GoogleIcon />
            {googleLoading ? "Continuing..." : "Continue with Google"}
          </button>

          <AuthDivider />

          <div>
            <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-[#111118] p-1">
              {(["login", "signup"] as const).map((mode) => (
                <button
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    emailMode === mode
                      ? "bg-[#7c6af7] text-white"
                      : "text-[#888899] hover:text-white"
                  }`}
                  key={mode}
                  onClick={() => setEmailMode(mode)}
                  type="button"
                >
                  {mode === "login" ? "Login" : "Sign Up"}
                </button>
              ))}
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleEmailSubmit}>
              <input
                className={inputClassName}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                type="email"
                value={email}
              />
              <input
                className={inputClassName}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
                value={password}
              />
              {isEmailSignup && (
                <input
                  className={inputClassName}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  type="password"
                  value={confirmPassword}
                />
              )}
              <button
                className="w-full rounded-lg bg-[#f0c040] py-3 font-bold text-[#111118] transition hover:bg-[#ffd75e] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={emailLoading}
                type="submit"
              >
                {emailLoading
                  ? "Please wait..."
                  : isEmailSignup
                    ? "Create Account"
                    : "Login with Email"}
              </button>
            </form>

            <button
              className="mt-3 w-full text-center text-sm text-[#888899] transition hover:text-[#f0c040] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={emailLoading}
              onClick={handleForgotPassword}
              type="button"
            >
              Forgot Password?
            </button>
          </div>

          <AuthDivider />

          <div>
            <h2 className="text-sm font-semibold text-white">Phone OTP</h2>
            <div className="mt-3 flex rounded-lg border border-white/[0.08] bg-[#1a1a24] transition focus-within:border-[#7c6af7]">
              <span className="flex items-center border-r border-white/[0.08] px-3 text-sm font-semibold text-[#f0f0f0]/80">
                +91
              </span>
              <input
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-white outline-none placeholder:text-[#444455]"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="98765 43210"
                type="tel"
                value={phone}
              />
            </div>

            <button
              className="mt-3 w-full rounded-lg border border-[#f0c040]/70 py-3 font-semibold text-[#f0c040] transition hover:bg-[#f0c040]/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={otpLoading || countdown > 0}
              onClick={handleSendOTP}
              type="button"
            >
              {otpLoading
                ? "Sending OTP..."
                : countdown > 0
                  ? `Resend OTP in ${countdown}s`
                  : "Send OTP"}
            </button>

            {confirmationResult && (
              <div className="mt-3 space-y-3">
                <input
                  className={inputClassName}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit OTP"
                  type="text"
                  value={otp}
                />
                <button
                  className="w-full rounded-lg bg-[#f0c040] py-3 font-bold text-[#111118] transition hover:bg-[#ffd75e] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={verifyLoading}
                  onClick={handleVerifyOTP}
                  type="button"
                >
                  {verifyLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#444455]">
          By continuing you agree to our Terms of Service
        </p>
      </section>

      <div id="recaptcha-container" />
    </main>
  );
}
