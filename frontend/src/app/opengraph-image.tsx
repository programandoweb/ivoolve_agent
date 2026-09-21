import { ImageResponse } from "next/og";

export const alt =
  "Ivoolve Agent — Multi-Agent AI Control Center para crear y orquestar agentes de IA";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #09090b 0%, #18181b 48%, #2e1065 100%)",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif"
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: 999,
            top: -220,
            left: -120,
            background: "rgba(124,58,237,.28)",
            filter: "blur(10px)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 440,
            height: 440,
            borderRadius: 999,
            right: -100,
            bottom: -230,
            background: "rgba(139,92,246,.24)",
            filter: "blur(10px)"
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            padding: "70px 76px",
            position: "relative"
          }}
        >
          <div
            style={{
              width: "61%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(145deg, #8b5cf6 0%, #6d28d9 100%)",
                  boxShadow: "0 18px 60px rgba(124,58,237,.35)"
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "7px solid #ffffff"
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    letterSpacing: "-1px"
                  }}
                >
                  Ivoolve Agent
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 17,
                    color: "#c4b5fd",
                    letterSpacing: "2px",
                    textTransform: "uppercase"
                  }}
                >
                  Multi-Agent AI Control Center
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div
                style={{
                  fontSize: 65,
                  lineHeight: 1.02,
                  fontWeight: 900,
                  letterSpacing: "-3.5px"
                }}
              >
                Crea. Orquesta.
                <br />
                Evoluciona.
              </div>
              <div
                style={{
                  marginTop: 26,
                  width: 620,
                  fontSize: 24,
                  lineHeight: 1.45,
                  color: "#d4d4d8"
                }}
              >
                Construye agentes de IA, coordina sus capacidades y observa el
                runtime desde un solo lugar.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12
              }}
            >
              {["NestJS", "Redis", "Socket.IO", "Next.js"].map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid rgba(255,255,255,.12)",
                    color: "#e4e4e7",
                    fontSize: 16,
                    fontWeight: 700
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              width: "39%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 330,
                height: 330,
                borderRadius: 999,
                border: "2px solid rgba(196,181,253,.22)"
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 230,
                height: 230,
                borderRadius: 999,
                border: "2px solid rgba(196,181,253,.28)"
              }}
            />

            {[
              { x: 40, y: 98 },
              { x: 320, y: 75 },
              { x: 350, y: 315 },
              { x: 95, y: 390 }
            ].map((node, index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: node.x,
                  top: node.y,
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  background: "#ffffff",
                  border: "8px solid #7c3aed",
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)"
                }}
              />
            ))}

            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 46,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(145deg, #8b5cf6 0%, #6d28d9 58%, #4c1d95 100%)",
                boxShadow: "0 30px 100px rgba(124,58,237,.45)"
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  border: "10px solid rgba(255,255,255,.95)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: "#ffffff"
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 17,
                  fontWeight: 800
                }}
              >
                ORCHESTRATOR
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
