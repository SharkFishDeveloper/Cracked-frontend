"use client";

import { useRef } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
}

export default function OtpInput({
  length = 5,
  value,
  onChange,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (digit: string, index: number) => {
    if (!/^[0-9]?$/.test(digit)) return;

    const otpArray = value.split("").concat(Array(length).fill("")).slice(0, length);
    otpArray[index] = digit;

    const newOtp = otpArray.join("").slice(0, length);
    onChange(newOtp);

    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);

    if (pasted.length === length) {
      inputsRef.current[length - 1]?.focus();
    }
  };

  const digits = value.padEnd(length).slice(0, length).split("");

  
  return (
    <div className="flex justify-between gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          //@ts-ignore
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit.trim()}
          onChange={(e) => handleChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-lg font-semibold 
                     border border-neutral-300 rounded-md
                     focus:outline-none focus:border-neutral-900
                     transition bg-white text-neutral-900"
        />
      ))}
    </div>
  );
}