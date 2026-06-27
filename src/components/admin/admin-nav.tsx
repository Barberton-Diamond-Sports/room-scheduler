import Link from "next/link";

type AdminNavProps = {
  todayValue: string;
};

function navLinkStyle(bg: string, border: string, color: string) {
  return {
    display: "block",
    padding: "0.65rem 1rem",
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: "10px",
    color,
    textDecoration: "none",
    fontWeight: 600,
    textAlign: "center" as const,
  };
}

const navSections = [
  {
    title: "Dashboard",
    links: [
      {
        label: "Admin Dashboard",
        href: "/admin",
        bg: "#eef2ff",
        border: "#c7d2fe",
        color: "#1e3a8a",
      },
      {
        label: "Home",
        href: "/",
        bg: "#f8fafc",
        border: "#dbe3f0",
        color: "#475569",
      },
    ],
  },
  {
    title: "Bookings",
    links: [
      {
        label: "Admin Field Booking",
        href: "/admin/book-with-umpire",
        bg: "#ecfeff",
        border: "#a5f3fc",
        color: "#155e75",
      },
      {
        label: "Weekly Calendar",
        href: "",
        bg: "#dbeafe",
        border: "#93c5fd",
        color: "#1d4ed8",
      },
      {
        label: "Reservations by Team",
        href: "/team-schedule",
        bg: "#f0fdf4",
        border: "#86efac",
        color: "#166534",
      },
      {
        label: "Reservations by Field",
        href: "/field-reservations",
        bg: "#fff7ed",
        border: "#fdba74",
        color: "#9a3412",
      },
    ],
  },
  {
    title: "Scheduling",
    links: [
      {
        label: "Field Blackouts",
        href: "/admin/blackouts",
        bg: "#fee2e2",
        border: "#fca5a5",
        color: "#991b1b",
      },
      {
        label: "Umpire Schedule",
        href: "/admin/umpire-schedule",
        bg: "#ede9fe",
        border: "#c4b5fd",
        color: "#6d28d9",
      },
      {
        label: "Assign Umpires",
        href: "/umpire-assignments",
        bg: "#e0f2fe",
        border: "#7dd3fc",
        color: "#0369a1",
      },
    ],
  },
  {
    title: "Management",
    links: [
      {
        label: "Manage Fields",
        href: "/admin/rooms",
        bg: "#ecfccb",
        border: "#bef264",
        color: "#3f6212",
      },
      {
        label: "Manage Teams",
        href: "/admin/teams",
        bg: "#f3e8ff",
        border: "#d8b4fe",
        color: "#7c3aed",
      },
      {
        label: "Manage Umpires",
        href: "/admin/umpires",
        bg: "#fef3c7",
        border: "#facc15",
        color: "#92400e",
      },
      {
        label: "Manage Admin Users",
        href: "/admin/users",
        bg: "#e0f2fe",
        border: "#7dd3fc",
        color: "#0369a1",
      },
    ],
  },
];

export default function AdminNav({ todayValue }: AdminNavProps) {
  const sections = navSections.map((section) => ({
    ...section,
    links: section.links.map((link) =>
      link.label === "Weekly Calendar"
        ? {
            ...link,
            href: `/bookings?date=${todayValue}&view=week`,
          }
        : link
    ),
  }));

  return (
    <nav aria-label="Admin navigation">
      <style>{`
        .admin-nav-desktop {
          display: block;
        }

        .admin-nav-mobile {
          display: none;
        }

        .admin-nav-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        }

        .admin-nav-section {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #f8fafc;
          padding: 0.85rem;
        }

        .admin-nav-title {
          font-weight: 800;
          color: #334155;
          font-size: 0.9rem;
          margin-bottom: 0.65rem;
        }

        .admin-nav-links {
          display: grid;
          gap: 0.55rem;
        }

        .admin-nav-mobile details {
          border: 1px solid #dbe3f0;
          border-radius: 14px;
          background: #f8fafc;
          padding: 0.85rem;
        }

        .admin-nav-mobile summary {
          cursor: pointer;
          font-weight: 800;
          color: #0f172a;
          font-size: 1rem;
          list-style: none;
        }

        .admin-nav-mobile summary::-webkit-details-marker {
          display: none;
        }

        .admin-nav-mobile-content {
          display: grid;
          gap: 1rem;
          margin-top: 1rem;
        }

        @media (max-width: 768px) {
          .admin-nav-desktop {
            display: none;
          }

          .admin-nav-mobile {
            display: block;
          }
        }
      `}</style>

      <div className="admin-nav-desktop">
        <div className="admin-nav-grid">
          {sections.map((section) => (
            <div key={section.title} className="admin-nav-section">
              <div className="admin-nav-title">{section.title}</div>

              <div className="admin-nav-links">
                {section.links.map((link) => (
                  <Link
                    key={`${section.title}-${link.label}`}
                    href={link.href}
                    style={navLinkStyle(link.bg, link.border, link.color)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-nav-mobile">
        <details>
          <summary>☰ Admin Menu</summary>

          <div className="admin-nav-mobile-content">
            {sections.map((section) => (
              <div key={section.title} className="admin-nav-section">
                <div className="admin-nav-title">{section.title}</div>

                <div className="admin-nav-links">
                  {section.links.map((link) => (
                    <Link
                      key={`mobile-${section.title}-${link.label}`}
                      href={link.href}
                      style={navLinkStyle(link.bg, link.border, link.color)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}