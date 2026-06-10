
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
          padding: "3rem 1.5rem 2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "24px",
            padding: "2rem",
            boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              backgroundColor: "#dbeafe",
              color: "#1d4ed8",
              fontWeight: 700,
              fontSize: "0.88rem",
              marginBottom: "1rem",
            }}
          >
            Barberton Diamond Sports
          </div>

          <h1
            style={{
              fontSize: "2.5rem",
              lineHeight: 1.15,
              marginTop: 0,
              marginBottom: "0.85rem",
              color: "#0f172a",
              maxWidth: "820px",
            }}
          >
            Barberton Diamond Sports Field Reservations.
          </h1>

          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.65,
              color: "#475569",
              marginTop: 0,
              marginBottom: "1.75rem",
              maxWidth: "760px",
            }}
          >
            Book a field, check field availability, and view the calendar for future reservations.
          </p>

          <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
            <Link
              href="/book"
              style={{
                display: "inline-block",
                padding: "0.9rem 1.25rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
              }}
            >
              Book a Field
            </Link>

            <Link
              href={`/bookings?date=${todayValue}&view=week`}
              style={{
                display: "inline-block",
                padding: "0.9rem 1.25rem",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                border: "1px solid #bfdbfe",
              }}
            >
              View Calendar
            </Link>

            <Link
              href="/admin"
              style={{
                display: "inline-block",
                padding: "0.9rem 1.25rem",
                backgroundColor: "#ede9fe",
                color: "#6d28d9",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                border: "1px solid #ddd6fe",
              }}
            >
              Administration
            </Link>
          </div>

          <div style={{ display: "grid", gap: "0.85rem" }}>
            {[
              "Day and week calendar views with clickable bookings",
              "Game and scrimmage details",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start", color: "#334155" }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    backgroundColor: "#2563eb",
                    marginTop: "0.45rem",
                    flexShrink: 0,
                  }}
                />
                <div style={{ lineHeight: 1.55 }}>{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
