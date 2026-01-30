import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Hemmi Pricing Plans";
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
            gap: "32px",
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
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                backgroundColor: "#171717",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#faf9f7",
                fontSize: "32px",
                fontWeight: "bold",
              }}
            >
              H
            </div>
            <span
              style={{
                fontSize: "48px",
                fontWeight: "600",
                color: "#171717",
                letterSpacing: "-0.02em",
              }}
            >
              Hemmi
            </span>
          </div>

          <span
            style={{
              fontSize: "42px",
              fontWeight: "600",
              color: "#171717",
              textAlign: "center",
            }}
          >
            Pricing Plans
          </span>

          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "16px",
            }}
          >
            {[
              { name: "Basic", price: "$9.99" },
              { name: "Pro", price: "$19.99", popular: true },
              { name: "Premium", price: "$29.99" },
            ].map((plan) => (
              <div
                key={plan.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "24px 40px",
                  borderRadius: "16px",
                  backgroundColor: plan.popular ? "#171717" : "#ffffff",
                  color: plan.popular ? "#faf9f7" : "#171717",
                  border: plan.popular ? "none" : "2px solid #e5e5e5",
                }}
              >
                <span style={{ fontSize: "18px", fontWeight: "500" }}>
                  {plan.name}
                </span>
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    marginTop: "8px",
                  }}
                >
                  {plan.price}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    opacity: 0.7,
                  }}
                >
                  /month
                </span>
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
