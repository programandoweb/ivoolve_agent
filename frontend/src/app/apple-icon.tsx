import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          borderRadius: 40
        }}
      >
        <div
          style={{
            width: 146,
            height: 146,
            borderRadius: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(145deg, #8b5cf6 0%, #6d28d9 55%, #4c1d95 100%)"
          }}
        >
          <div
            style={{
              width: 86,
              height: 86,
              border: "7px solid rgba(221,214,254,.7)",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "#ffffff",
                boxShadow: "0 0 28px rgba(255,255,255,.35)"
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
