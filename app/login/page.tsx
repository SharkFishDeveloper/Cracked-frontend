"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import OtpInput from "@/components/OtpInput";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Please fill all fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          deviceType: "WEB",
        }),
      });

      const data = await res.json();

      // 🔥 If email not verified
      if (res.status === 403) {
        setShowOtp(true);
        setMessage("Verification code sent to your email.");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }

      // Normal login
      login(data.accessToken, data.refreshToken);
      router.push("/dashboard");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 5) {
      setError("Enter complete OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: otp,
          deviceType: "WEB",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid OTP");
        return;
      }

      login(data.accessToken, data.refreshToken);
      router.push("/dashboard");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-8">

        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Login
        </h2>

        <p className="text-sm text-neutral-500 mb-6">
          Enter your credentials to continue.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            disabled={showOtp}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            disabled={showOtp}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition"
          />

          {!showOtp && (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          )}
        </div>

        {showOtp && (
          <div className="mt-6 space-y-4">
            <OtpInput length={5} value={otp} onChange={setOtp} />

            <button
              onClick={handleOtpVerify}
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-black transition disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-6 text-sm text-red-500 text-center">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-6 text-sm text-green-600 text-center">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}