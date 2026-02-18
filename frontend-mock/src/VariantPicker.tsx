import { Link } from "react-router-dom";

export default function VariantPicker() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0e0e0e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem",
        fontFamily: "'Instrument Sans', sans-serif",
      }}
    >
      <h1
        style={{
          color: "#fff",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginBottom: "0.5rem",
        }}
      >
        Beyond Chat
      </h1>
      <p
        style={{
          color: "#666",
          fontSize: "1.05rem",
          marginBottom: "4rem",
          textAlign: "center",
        }}
      >
        Nine design directions. Pick one.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
          maxWidth: "1100px",
          width: "100%",
        }}
      >
        {/* Broadsheet */}
        <Link
          to="/broadsheet"
          style={{
            textDecoration: "none",
            background: "#FAF7F2",
            borderRadius: "4px",
            padding: "2.5rem 2rem",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-4px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0)")
          }
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "#999",
              marginBottom: "1rem",
            }}
          >
            Vol. I
          </div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2rem",
              fontWeight: 600,
              color: "#1a1a1a",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
            }}
          >
            The Broadsheet
          </h2>
          <p
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: "0.9rem",
              color: "#666",
              lineHeight: 1.6,
            }}
          >
            Editorial print aesthetic. Serif typography, newspaper columns,
            crimson accents, ivory paper.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.75rem",
            }}
          >
            <Link
              to="/broadsheet"
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: "0.75rem",
                color: "#1a1a1a",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Landing
            </Link>
            <Link
              to="/broadsheet/pricing"
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: "0.75rem",
                color: "#1a1a1a",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Pricing
            </Link>
            <Link
              to="/broadsheet/login"
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: "0.75rem",
                color: "#1a1a1a",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Login
            </Link>
          </div>
        </Link>

        {/* Toybox */}
        <Link
          to="/toybox"
          style={{
            textDecoration: "none",
            background: "#fff",
            borderRadius: "24px",
            padding: "2.5rem 2rem",
            border: "3px solid #222",
            transition: "transform 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "rotate(-1deg) scale(1.02)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "rotate(0) scale(1)")
          }
        >
          <div
            style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#FF5C38",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-10px",
              left: "30px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#FFD43B",
            }}
          />
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#FF5C38",
              fontWeight: 700,
              marginBottom: "1rem",
              position: "relative",
            }}
          >
            No. 02
          </div>
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "2rem",
              fontWeight: 800,
              color: "#222",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
              position: "relative",
            }}
          >
            Toybox
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.9rem",
              color: "#555",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            Bold geometric maximalism. Thick borders, primary pops, bouncy
            shapes, chunky type.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.5rem",
              position: "relative",
            }}
          >
            {["Landing", "Pricing", "Login"].map((page) => (
              <Link
                key={page}
                to={`/toybox${page === "Landing" ? "" : `/${page.toLowerCase()}`}`}
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "#222",
                  textDecoration: "none",
                  background: "#FFD43B",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "99px",
                  border: "2px solid #222",
                }}
              >
                {page}
              </Link>
            ))}
          </div>
        </Link>

        {/* Abyss */}
        <Link
          to="/abyss"
          style={{
            textDecoration: "none",
            background: "#000",
            borderRadius: "2px",
            padding: "2.5rem 2rem",
            border: "1px solid #1a1a1a",
            transition: "transform 0.3s ease, border-color 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.borderColor = "#0ff3";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "#1a1a1a";
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(ellipse at 30% 80%, rgba(0,180,180,0.06) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "#0cc",
              marginBottom: "1rem",
              position: "relative",
              opacity: 0.7,
            }}
          >
            // 003
          </div>
          <h2
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "1.8rem",
              fontWeight: 700,
              color: "#eee",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
              position: "relative",
            }}
          >
            Abyss
          </h2>
          <p
            style={{
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: "0.9rem",
              color: "#555",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            Cinematic void. Monospace code aesthetic, grain textures,
            bioluminescent accents, deep black.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.75rem",
              position: "relative",
            }}
          >
            {["Landing", "Pricing", "Login"].map((page) => (
              <Link
                key={page}
                to={`/abyss${page === "Landing" ? "" : `/${page.toLowerCase()}`}`}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.65rem",
                  color: "#0cc",
                  textDecoration: "none",
                  letterSpacing: "0.05em",
                  opacity: 0.6,
                }}
              >
                [{page.toLowerCase()}]
              </Link>
            ))}
          </div>
        </Link>

        {/* Atelier */}
        <Link
          to="/atelier"
          style={{
            textDecoration: "none",
            background: "#F7F7F5",
            borderRadius: "16px",
            padding: "2.5rem 2rem",
            border: "1px solid #E8E8E6",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(91,79,233,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Dot grid background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.4,
              backgroundImage:
                "radial-gradient(circle, #ccc 0.8px, transparent 0.8px)",
              backgroundSize: "20px 20px",
              pointerEvents: "none",
            }}
          />
          {/* Colored accent bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #5B4FE9, #F06225, #30A46C, #E5484D)",
            }}
          />
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#5B4FE9",
              fontWeight: 600,
              marginBottom: "1rem",
              position: "relative",
            }}
          >
            No. 04
          </div>
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#111",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
              position: "relative",
            }}
          >
            Atelier
          </h2>
          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "0.9rem",
              color: "#666",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            Professional workspace aesthetic. Dot-grid canvas, product-focused
            bento layouts, warm indigo + orange accents.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.5rem",
              position: "relative",
            }}
          >
            {["Landing", "Pricing", "Login"].map((page) => (
              <Link
                key={page}
                to={`/atelier${page === "Landing" ? "" : `/${page.toLowerCase()}`}`}
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#5B4FE9",
                  textDecoration: "none",
                  background: "#EEEDFC",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "6px",
                }}
              >
                {page}
              </Link>
            ))}
          </div>
        </Link>

        {/* Manifesto */}
        <Link
          to="/manifesto"
          style={{
            textDecoration: "none",
            background: "#FAFAFA",
            borderRadius: "0",
            padding: "2.5rem 2rem",
            border: "2px solid #000",
            transition: "transform 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-4px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0)")
          }
        >
          {/* Neon accent stripe */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "#BEFF00",
            }}
          />
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#666",
              marginBottom: "1rem",
              position: "relative",
            }}
          >
            No. 05
          </div>
          <h2
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: "2rem",
              fontWeight: 400,
              color: "#000",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
              position: "relative",
            }}
          >
            Manifesto
          </h2>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.85rem",
              color: "#666",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            Brutalist Swiss poster. Massive type, raw borders, electric
            neon accents, punk energy.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.5rem",
              position: "relative",
            }}
          >
            {["Landing", "Pricing", "Login"].map((page) => (
              <Link
                key={page}
                to={`/manifesto${page === "Landing" ? "" : `/${page.toLowerCase()}`}`}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "#000",
                  textDecoration: "none",
                  background: "#BEFF00",
                  padding: "0.3rem 0.75rem",
                  border: "2px solid #000",
                  letterSpacing: "0.05em",
                }}
              >
                {page.toUpperCase()}
              </Link>
            ))}
          </div>
        </Link>

        {/* Terrazzo */}
        <Link
          to="/terrazzo"
          style={{
            textDecoration: "none",
            background: "#FBF7F0",
            borderRadius: "24px",
            padding: "2.5rem 2rem",
            border: "1px solid #E8DFD1",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(200,85,61,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Decorative blobs */}
          <div
            style={{
              position: "absolute",
              top: "-30px",
              right: "-20px",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(200,85,61,0.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-15px",
              left: "20px",
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              background: "rgba(123,148,107,0.08)",
            }}
          />
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "#C8553D",
              fontWeight: 600,
              marginBottom: "1rem",
              position: "relative",
            }}
          >
            No. 06
          </div>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#2E1F14",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
              position: "relative",
            }}
          >
            Terrazzo
          </h2>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "0.9rem",
              color: "#A89F91",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            Mediterranean artisanal. Warm speckled textures, organic shapes,
            earthy terracotta & sage tones.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.5rem",
              position: "relative",
            }}
          >
            {["Landing", "Pricing", "Login"].map((page) => (
              <Link
                key={page}
                to={`/terrazzo${page === "Landing" ? "" : `/${page.toLowerCase()}`}`}
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#2E1F14",
                  textDecoration: "none",
                  background: "#E8DFD1",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "99px",
                }}
              >
                {page}
              </Link>
            ))}
          </div>
        </Link>

        {/* Noir */}
        <Link
          to="/noir"
          style={{
            textDecoration: "none",
            background: "#0A0A0A",
            borderRadius: "0",
            padding: "2.5rem 2rem",
            border: "1px solid #222",
            transition: "transform 0.3s ease, border-color 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.borderColor = "#D4A843";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "#222";
          }}
        >
          {/* Diagonal light shaft */}
          <div
            style={{
              position: "absolute",
              top: "-20%",
              right: "-10%",
              width: "60%",
              height: "140%",
              background:
                "linear-gradient(135deg, transparent 0%, rgba(212,168,67,0.04) 50%, transparent 60%)",
              transform: "rotate(-15deg)",
              pointerEvents: "none",
            }}
          />
          {/* Gold top line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "60px",
              height: "2px",
              background: "#D4A843",
            }}
          />
          <div
            style={{
              fontFamily: "'Libre Franklin', sans-serif",
              fontSize: "0.65rem",
              fontWeight: 300,
              letterSpacing: "0.25em",
              color: "#D4A843",
              marginBottom: "1rem",
              position: "relative",
            }}
          >
            NO. 07
          </div>
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "2.2rem",
              fontWeight: 400,
              color: "#F5F0E8",
              lineHeight: 1.1,
              letterSpacing: "0.04em",
              marginBottom: "0.75rem",
              position: "relative",
            }}
          >
            NOIR
          </h2>
          <p
            style={{
              fontFamily: "'Libre Franklin', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 300,
              color: "#666",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            Film noir cinematic. Venetian blind shadows, gold accents,
            dramatic contrast, condensed type.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.75rem",
              position: "relative",
            }}
          >
            {["Landing", "Pricing", "Login"].map((page) => (
              <Link
                key={page}
                to={`/noir${page === "Landing" ? "" : `/${page.toLowerCase()}`}`}
                style={{
                  fontFamily: "'Libre Franklin', sans-serif",
                  fontSize: "0.65rem",
                  fontWeight: 300,
                  color: "#D4A843",
                  textDecoration: "none",
                  letterSpacing: "0.08em",
                }}
              >
                {page}
              </Link>
            ))}
          </div>
        </Link>

        {/* Wavelength */}
        <Link
          to="/wavelength"
          style={{
            textDecoration: "none",
            background: "#0C0F1A",
            borderRadius: "16px",
            padding: "2.5rem 2rem",
            border: "1px solid #1e2235",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,0,110,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Spectrum line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #FF006E, #FF6B35, #00D4FF)",
            }}
          />
          {/* Ambient glow */}
          <div
            style={{
              position: "absolute",
              bottom: "-30px",
              right: "-20px",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.65rem",
              color: "#6B6A80",
              letterSpacing: "0.06em",
              marginBottom: "1rem",
              position: "relative",
            }}
          >
            // 08
          </div>
          <h2
            style={{
              fontFamily: "'Urbanist', sans-serif",
              fontSize: "2rem",
              fontWeight: 800,
              color: "#E8E6F0",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: "0.75rem",
              position: "relative",
            }}
          >
            Wavelength
          </h2>
          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.82rem",
              color: "#6B6A80",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            Audio/synth visualization. Spectrum gradients, flowing waveforms,
            dark electronic aesthetic.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.5rem",
              position: "relative",
            }}
          >
            {["Landing", "Pricing", "Login"].map((page) => (
              <Link
                key={page}
                to={`/wavelength${page === "Landing" ? "" : `/${page.toLowerCase()}`}`}
                style={{
                  fontFamily: "'Urbanist', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#0C0F1A",
                  textDecoration: "none",
                  background: "linear-gradient(90deg, #FF006E, #FF6B35, #00D4FF)",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "6px",
                }}
              >
                {page}
              </Link>
            ))}
          </div>
        </Link>

        {/* Zenith */}
        <Link
          to="/zenith"
          style={{
            textDecoration: "none",
            background: "#FCFBF9",
            borderRadius: "0",
            padding: "2.5rem 2rem",
            border: "1px solid #E9E6E1",
            transition: "transform 0.3s ease",
            position: "relative",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-4px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0)")
          }
        >
          <div
            style={{
              fontFamily: "'Karla', sans-serif",
              fontSize: "0.65rem",
              fontWeight: 400,
              letterSpacing: "0.2em",
              color: "#9E9A93",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            No. 09
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2rem",
              fontWeight: 400,
              fontStyle: "italic",
              color: "#2C2C2C",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
            }}
          >
            Zenith
          </h2>
          <p
            style={{
              fontFamily: "'Karla', sans-serif",
              fontSize: "0.9rem",
              color: "#9E9A93",
              lineHeight: 1.6,
            }}
          >
            Japanese Zen minimalism. Extreme whitespace, hairline dividers,
            near-monochromatic elegance.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "1rem",
            }}
          >
            {["Landing", "Pricing", "Login"].map((page) => (
              <Link
                key={page}
                to={`/zenith${page === "Landing" ? "" : `/${page.toLowerCase()}`}`}
                style={{
                  fontFamily: "'Karla', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: 400,
                  color: "#2C2C2C",
                  textDecoration: "none",
                  borderBottom: "1px solid #E9E6E1",
                  paddingBottom: "2px",
                }}
              >
                {page}
              </Link>
            ))}
          </div>
        </Link>
      </div>
    </div>
  );
}
