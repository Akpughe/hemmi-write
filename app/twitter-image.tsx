import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Hemmi - AI Writing Assistant";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf9f7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                backgroundColor: "#171717",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#faf9f7",
                fontSize: "40px",
                fontWeight: "bold",
              }}
            >
              H
            </div>
            <span
              style={{
                fontSize: "64px",
                fontWeight: "600",
                color: "#171717",
                letterSpacing: "-0.02em",
              }}
            >
              Hemmi
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "36px",
                fontWeight: "500",
                color: "#171717",
                textAlign: "center",
              }}
            >
              AI Writing Assistant
            </span>
            <span
              style={{
                fontSize: "24px",
                color: "#666666",
                textAlign: "center",
                maxWidth: "800px",
              }}
            >
              Research, plan, and write papers 10x faster
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            {["Research Papers", "Essays", "Reports"].map((item) => (
              <div
                key={item}
                style={{
                  padding: "12px 24px",
                  borderRadius: "100px",
                  backgroundColor: "#171717",
                  color: "#faf9f7",
                  fontSize: "18px",
                  fontWeight: "500",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
