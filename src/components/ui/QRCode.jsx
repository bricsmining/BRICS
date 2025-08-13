// src/components/ui/QRCode.jsx

import React from "react";

/**
 * QRCode component using api.qrserver.com (no dependencies)
 * @param {string} value - The data to encode in the QR code
 * @param {number} size - The width/height in pixels (default: 120)
 * @param {string} bgColor - Background color in hex (default: "0f2027")
 * @param {string} fgColor - Foreground color in hex (default: "38bdf8")
 */
const QRCode = ({
  value,
  size = 120,
  bgColor = "0f2027",
  fgColor = "38bdf8",
  className = "",
  style = {},
  ...props
}) => {
  // Convert hex color to "r,g,b"
  const hexToRgb = (hex) => {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
    const num = parseInt(hex, 16);
    return [num >> 16, (num >> 8) & 255, num & 255].join(",");
  };

  const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
    value
  )}&size=${size}x${size}&bgcolor=${hexToRgb(bgColor)}&color=${hexToRgb(fgColor)}`;

  return (
    <img
      src={url}
      alt="QR Code"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 8, background: `#${bgColor}`, ...style }}
      {...props}
    />
  );
};

export default QRCode;
