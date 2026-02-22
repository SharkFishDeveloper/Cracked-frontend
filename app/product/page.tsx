"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import plans from "@/lib/plans";

declare global {
  interface Window {
    Razorpay: any;
  }
}

  const Product = () => {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Load Razorpay script once
    useEffect(() => {
      if (window.Razorpay) return;

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }, []);

    const handlePayment = async (plan: any) => {
    if (loading) return;

    // ✅ 1. Check login state
    if (!isAuthenticated) {
      alert("Please login first");
      return;
    }

    // ✅ 2. Check token exists
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      alert("Session expired. Please login again.");
      return;
    }

    try {
      setLoading(true);

      // ✅ 3. OPTIONAL: Verify token with backend before creating order
      const check = await fetch("/api/check-auth", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!check.ok) {
        alert("Session invalid. Please login again.");
        setLoading(false);
        return;
      }

      // ✅ 4. Now create order
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: plan.planId }),
      });
      const data = await res.json();
      console.log(data)
      if (!data.order) {
        if(data.error === "Plan still active"){
          return alert("Plan still active");
        }
        alert("Failed to create order");
        setLoading(false);
        return;
      }

      if (!window.Razorpay) {
        alert("Razorpay not loaded");
        setLoading(false);
        return;
      }

      // ✅ 5. Only now open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: "Cracked AI Test",
        description: `${plan.time} Minutes Plan`,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: plan.planId,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              alert("Payment successful 🎉");
              router.replace("/dashboard")
              router.refresh();
            } else {
              alert(verifyData.error || "Verification failed");
            }
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        theme: { color: "#000000" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black py-20 px-6 font-sans">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-4xl font-black tracking-tight uppercase mb-4">
          AI Interview <span className="text-zinc-400">Assistant</span>
        </h1>
        <p className="text-zinc-600 font-medium text-lg">
          On-screen intelligence for your next technical round.
          Purchase time-credits and use them when you're live.
        </p>
      </div>

      {/* Grid */}
      <div className="flex flex-col md:flex-row gap-0 justify-center items-stretch max-w-4xl mx-auto border-t border-l border-black">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`flex-1 p-10 border-r border-b border-black flex flex-col transition-colors ${
              plan.highlight ? "bg-zinc-50" : "bg-white"
            }`}
          >
            <div className="mb-8">
              <span
                className={`text-[18px] font-bold uppercase tracking-widest px-2 py-1 border border-black ${
                  plan.highlight
                    ? "bg-black text-white"
                    : "text-black"
                }`}
              >
                {plan.name}
              </span>
              <div className="mt-6 flex items-baseline">
                <span className="text-5xl font-black tracking-tighter">
                  ₹{plan.price}
                </span>
                <span className="ml-2 text-zinc-500 font-bold uppercase text-xs">
                  / {plan.time}
                </span>
              </div>
            </div>

            <p className="text-zinc-700 text-sm mb-8 leading-relaxed font-medium">
              {plan.description}
            </p>

            <ul className="mb-10 space-y-3 flex-grow">
              {plan.features.map((feature, i: number) => (
                <li
                  key={i}
                  className="flex items-start text-xs font-bold uppercase tracking-tight"
                >
                  <span className="mr-2 mt-0.5">→</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePayment(plan)}
              className={`w-full py-4 font-black uppercase tracking-tighter border-2 border-black transition-all active:translate-y-1 active:shadow-none ${
                plan.highlight
                  ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800"
                  : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100"
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-zinc-400 text-[11px] font-bold uppercase tracking-[0.2em]">
          Local Test Mode Enabled • Credits never expire
        </p>
      </div>
    </div>
  );
};

export default Product;