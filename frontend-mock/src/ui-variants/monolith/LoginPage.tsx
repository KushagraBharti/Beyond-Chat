import { Link } from "react-router-dom";

const titleFont = "'Anton', sans-serif";
const bodyFont = "'Oswald', sans-serif";

export default function MonolithLogin() {
    return (
        <div
            style={{
                height: "100vh",
                background: "#D3D3D3",
                color: "#111",
                fontFamily: bodyFont,
                textTransform: "uppercase",
                display: "grid",
                gridTemplateColumns: "1fr 1fr"
            }}
        >
            <div style={{ background: "#111", padding: "4rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Link to="/monolith" style={{ color: "#D3D3D3", textDecoration: "none", fontSize: "1.5rem", fontWeight: 700, fontFamily: titleFont }}>&lt; BACK</Link>

                <div style={{ color: "#444", fontSize: "16vw", fontFamily: titleFont, lineHeight: 0.8, userSelect: "none", overflow: "hidden" }}>
                    AUTH
                </div>
            </div>

            <div style={{ padding: "4rem", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: "600px" }}>
                <h1 style={{ fontFamily: titleFont, fontSize: "5rem", margin: "0 0 2rem 0", lineHeight: 1 }}>IDENTIFY<br />YOURSELF</h1>

                <form style={{ display: "flex", flexDirection: "column", gap: "2rem" }} onSubmit={e => e.preventDefault()}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: "1.5rem", fontWeight: 700, borderBottom: "5px solid #111", paddingBottom: "0.5rem" }}>CREDENTIAL_01 / EMAIL</label>
                        <input
                            type="text"
                            style={{
                                background: "transparent",
                                border: "none",
                                borderBottom: "5px solid transparent",
                                padding: "1rem 0",
                                fontSize: "2rem",
                                fontFamily: bodyFont,
                                fontWeight: 700,
                                color: "#111",
                                outline: "none"
                            }}
                            onFocus={e => e.currentTarget.style.borderBottom = "5px solid #111"}
                            onBlur={e => e.currentTarget.style.borderBottom = "5px solid transparent"}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: "1.5rem", fontWeight: 700, borderBottom: "5px solid #111", paddingBottom: "0.5rem" }}>CREDENTIAL_02 / PASS</label>
                        <input
                            type="password"
                            style={{
                                background: "transparent",
                                border: "none",
                                borderBottom: "5px solid transparent",
                                padding: "1rem 0",
                                fontSize: "2rem",
                                fontFamily: bodyFont,
                                fontWeight: 700,
                                color: "#111",
                                outline: "none"
                            }}
                            onFocus={e => e.currentTarget.style.borderBottom = "5px solid #111"}
                            onBlur={e => e.currentTarget.style.borderBottom = "5px solid transparent"}
                        />
                    </div>

                    <button style={{
                        background: "#111",
                        color: "#D3D3D3",
                        fontFamily: titleFont,
                        fontSize: "3rem",
                        padding: "1.5rem",
                        border: "none",
                        marginTop: "1rem",
                        cursor: "pointer"
                    }}>
                        LOGIN DEPLOY
                    </button>
                </form>
            </div>
        </div>
    );
}
