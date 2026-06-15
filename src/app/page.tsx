import Link from "next/link";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function HomePage() {
  const todayValue = toDateInputValue(new Date());

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 45%, #ffffff 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem 1rem", // reduced side padding for mobile
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "20px",
            padding: "1.5rem",
            boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          

          <h1
            style={{
              fontSize: "2rem", // smaller for mobile
              lineHeight: 1.2,
              marginTop: 0,
              marginBottom: "0.75rem",
              color: "#0f172a",
              maxWidth: "820px",
            }}
          >
            Barberton Diamond Sports
          </h1>

          {/* FIXED: no nested <p> tags */}
          <div
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "#475569",
              marginBottom: "1.5rem",
              maxWidth: "760px",
            }}
          >
            <p style={{ margin: 0 }}>
              Use this link to book a field and see our calendar.
            </p>
            <p style={{ margin: "0.5rem 0 0 0" }}>
              Umpires can sign up for upcoming games or see their schedule.
            </p>
          </div>

          {/* ✅ Responsive button layout */}
          <div
            style={{
              display: "flex",
              flexDirection: "column", // stack on mobile
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <Link
              href="/book"
              style={{
                display: "block",
                width: "100%", // full width on mobile
                padding: "0.9rem 1.25rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Book a Field
            </Link>

            <Link
              href={`/bookings?date=${todayValue}&view=week`}
              style={{
                display: "block",
                width: "100%",
                padding: "0.9rem 1.25rem",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                border: "1px solid #bfdbfe",
                textAlign: "center",
              }}
            >
              View Calendar
            </Link>

            <Link
              href="/umpire-assignments"
              style={{
                display: "block",
                width: "100%",
                padding: "0.9rem 1.25rem",
                backgroundColor: "#ecfeff",
                color: "#155e75",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                border: "1px solid #a5f3fc",
                textAlign: "center",
              }}
            >
              Umpire Information
            </Link>

            <Link
              href="/admin"
              style={{
                display: "block",
                width: "100%",
                padding: "0.9rem 1.25rem",
                backgroundColor: "#ede9fe",
                color: "#6d28d9",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                border: "1px solid #ddd6fe",
                textAlign: "center",
              }}
            >
              Administration
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}
