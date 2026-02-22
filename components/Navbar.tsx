"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  return (
    <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200 bg-white">
      
      <span
        onClick={() => router.push("/")}
        className="font-semibold text-neutral-900 cursor-pointer"
      >
        Cracked
      </span>


     <span
        onClick={() => router.push("/product")}
        className="font-semibold text-neutral-900 cursor-pointer"
      >
        Products
      </span>



      {isAuthenticated ? (
        <LogoutButton />
      ) : (
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 rounded-md bg-neutral-900 text-white text-sm hover:bg-black transition"
        >
          Login
        </button>
      )}
    </div>
  );
}