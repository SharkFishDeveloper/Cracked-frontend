"use client";

import { useState } from "react";

const Signup = () => {
  const [step, setStep] = useState<"signup" | "otp">("signup");

  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
  });

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async () => {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error);
      return;
    }

    setMessage("OTP sent to your email");
    setStep("otp");
  };

  const handleVerify = async () => {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: form.email,
        otp,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error);
      return;
    }

    setMessage("Email verified successfully 🎉");
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto" }}>
      <h2>Signup</h2>

      {step === "signup" && (
        <>
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />
          <br />
          <br />
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
          <br />
          <br />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
          <br />
          <br />
          <button onClick={handleSignup}>Signup</button>
        </>
      )}

      {step === "otp" && (
        <>
          <h3>Enter OTP</h3>
          <input
            placeholder="5-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <br />
          <br />
          <button onClick={handleVerify}>Verify</button>
        </>
      )}

      <p style={{ marginTop: 20 }}>{message}</p>
    </div>
  );
};

export default Signup;