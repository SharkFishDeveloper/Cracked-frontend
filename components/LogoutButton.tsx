"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);

      const accessToken = localStorage.getItem("accessToken");

      if (accessToken) {
        await fetch("/api/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }

      // Always clear client state
      logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      logout();
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 rounded-md bg-neutral-900 text-white text-sm hover:bg-black transition disabled:opacity-60"
    >
      {loading ? "Signing out..." : "Logout"}
    </button>
  );
}