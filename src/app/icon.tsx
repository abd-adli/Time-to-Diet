import { ImageResponse } from "next/og";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 84,
          background: "linear-gradient(135deg, #0f172a 0%, #022c22 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "36px",
          border: "4px solid #10b981",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          🔥
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
