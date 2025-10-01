'use client';

import React, { useState, useMemo, useCallback } from "react";

type Props = {
  value?: number;             // القيمة الحالية
  size?: number;              // حجم النجمة px
  readOnly?: boolean;
  onChange?: (val: number) => void;
  className?: string;
  starColor?: string;         // لون التعبئة
  emptyColor?: string;        // لون الفراغ

  // تحسينات
  step?: number;              // خطوة التقريب (مثلاً 0.5)
  min?: number;               // أدنى قيمة
  max?: number;               // أعلى قيمة
  ariaLabel?: string;         // وسم مساعد للوصول
};

export default function RatingStars({
  value = 0,
  size = 24,
  readOnly = false,
  onChange,
  className = "",
  starColor = "#0ea5e9",      // ✅ لون مطابق لهوية متجر الهواتف
  emptyColor = "#e5e7eb",
  step = 0.5,
  min = 1,
  max = 5,
  ariaLabel = "قيّم بالنجوم",
}: Props) {
  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max]
  );
  const roundToStep = useCallback(
    (v: number) => Math.round(v / step) * step,
    [step]
  );

  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const numericValue = clamp(value ?? 0);
  const displayValue = hoverValue !== null ? hoverValue : numericValue;

  const stars = useMemo(
    () => Array.from({ length: Math.ceil(max) }, (_, i) => i + 1),
    [max]
  );

  // حساب من موقع الماوس داخل النجمة (لنصف/كسر نجمة)
  const calcFromMouse = (e: React.MouseEvent<HTMLSpanElement>, i: number) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const ratio = x / width;                 // 0..1
    const raw = i - 1 + ratio;               // 0..max
    return clamp(roundToStep(raw));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>, i: number) => {
    if (readOnly) return;
    setHoverValue(calcFromMouse(e, i));
  };

  const handleClick = () => {
    if (readOnly || onChange == null) return;
    onChange(clamp(roundToStep(displayValue)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || onChange == null) return;

    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      onChange(clamp(roundToStep(numericValue + step)));
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      onChange(clamp(roundToStep(numericValue - step)));
      e.preventDefault();
    } else if (e.key === "Home") {
      onChange(min);
      e.preventDefault();
    } else if (e.key === "End") {
      onChange(max);
      e.preventDefault();
    } else if (e.key === " " || e.key === "Enter") {
      onChange(clamp(roundToStep(displayValue)));
      e.preventDefault();
    }
  };

  return (
    <div
      dir="rtl"
      className={`flex flex-row-reverse items-center gap-1 select-none ${className}`}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(numericValue * 10) / 10}
      tabIndex={readOnly ? -1 : 0}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => !readOnly && setHoverValue(null)}
      style={{ maxWidth: `${size * stars.length}px` }}
    >
      {stars.map((i) => {
        const fillPercent = Math.min(Math.max(displayValue - (i - 1), 0), 1); // 0..1
        return (
          <span
            key={i}
            className={`relative inline-block ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            style={{ flex: "1 1 0", aspectRatio: "1 / 1" }}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onClick={handleClick}
            aria-hidden="true"
            title={`${(i - 1 + fillPercent).toFixed(1)} / ${max}`}
          >
            <StarOutline fill={emptyColor} />
            <span
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: `${fillPercent * 100}%`, height: "100%" }}
            >
              <StarSolid fill={starColor} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function StarSolid({ fill = "currentColor" }: { fill?: string }) {
  return (
    <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden>
      <path
        d="M9.049 2.927a1 1 0 011.902 0l1.07 3.294a1 1 0 00.95.69h3.462a1 1 0 01.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.294a1 1 0 01-1.539 1.118L10 13.347l-2.386 1.95a1 1 0 01-1.54-1.118l1.07-3.294a1 1 0 00-.364-1.118L3.978 8.72a1 1 0 01.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.294z"
        fill={fill}
      />
    </svg>
  );
}

function StarOutline({ fill = "currentColor" }: { fill?: string }) {
  return (
    <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden>
      <path
        d="M9.049 2.927a1 1 0 011.902 0l1.07 3.294a1 1 0 00.95.69h3.462a1 1 0 01.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.294a1 1 0 01-1.539 1.118L10 13.347l-2.386 1.95a1 1 0 01-1.54-1.118l1.07-3.294a1 1 0 00-.364-1.118L3.978 8.72a1 1 0 01.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.294z"
        fill="none"
        stroke={fill}
        strokeWidth="1"
      />
    </svg>
  );
}
