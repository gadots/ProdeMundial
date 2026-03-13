import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1628",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: "#22c55e",
            color: "#0a1628",
            fontSize: 56,
            fontWeight: 900,
            fontFamily: "sans-serif",
            letterSpacing: "-2px",
          }}
        >
          26
        </div>
      </div>
    ),
    { ...size }
  );
}
