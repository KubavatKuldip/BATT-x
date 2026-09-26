"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface BattXLogoProps {
  /**
   * Width of the logo in pixels
   */
  width?: number;
  /**
   * Height of the logo in pixels
   */
  height?: number;
  /**
   * CSS class name for additional styling
   */
  className?: string;
  /**
   * Priority loading for above-the-fold logos
   */
  priority?: boolean;
}

/**
 * Theme-aware BATT-X logo component
 * Automatically switches between light and dark logo based on current theme
 */
export function BattXLogo({
  width = 120,
  height = 120,
  className = "",
  priority = false
}: BattXLogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme to handle "system" theme setting
  const currentTheme = mounted ? (resolvedTheme || theme) : "light";
  const logoSrc = currentTheme === "dark"
    ? "/images/logo-dark.jpg"
    : "/images/logo-light.jpg";

  if (!mounted) {
    // Return placeholder during SSR to avoid hydration mismatch
    return (
      <div
        style={{ width, height }}
        className={className}
        aria-label="BATT-X Logo"
      />
    );
  }

  return (
    <Image
      src={logoSrc}
      alt="BATT-X Logo"
      width={width}
      height={height}
      className={className}
      priority={priority}
      style={{
        objectFit: "contain",
        width: "auto",
        height: "auto",
        maxWidth: width,
        maxHeight: height,
      }}
    />
  );
}
