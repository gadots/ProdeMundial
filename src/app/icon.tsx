import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1628",
          borderRadius: 7,
        }}
      >
        {/* Ball circle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#f59e0b",
            color: "#0a1628",
            fontSize: 11,
            fontWeight: 900,
            fontFamily: "sans-serif",
            letterSpacing: "-0.5px",
          }}
        >
          26
        </div>
      </div>
    ),
    { ...size }
  );
}
