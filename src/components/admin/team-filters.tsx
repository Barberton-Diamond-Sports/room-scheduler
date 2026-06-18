"use client";

import Link from "next/link";

type StatusFilterValue = "all" | "active" | "inactive";

type SeasonFilterOption = {
  value: string;
  label: string;
};

type Props = {
  selectedStatus: StatusFilterValue;
  selectedSeason: string;
  seasonFilterOptions: SeasonFilterOption[];
  hasActiveFilters: boolean;
};

const fieldLabelStyle = {
  display: "block",
  marginBottom: "0.4rem",
  fontWeight: 600,
  color: "#334155",
};

const fieldStyle = {
  width: "100%",
  padding: "0.75rem 0.9rem",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontSize: "1rem",
  boxSizing: "border-box" as const,
  opacity: 1,
  WebkitTextFillColor: "#0f172a",
};

export default function TeamFilters({
  selectedStatus,
  selectedSeason,
  seasonFilterOptions,
  hasActiveFilters,
}: Props) {
  return (
    <form
      method="GET"
      style={{
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        alignItems: "end",
      }}
    >
      <div>
        <label htmlFor="status" style={fieldLabelStyle}>
          Team Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={selectedStatus}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          style={{
            ...fieldStyle,
            minWidth: "180px",
          }}
        >
          <option value="all">All teams</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      <div>
        <label htmlFor="seasonFilter" style={fieldLabelStyle}>
          Season
        </label>
        <select
          id="seasonFilter"
          name="season"
          defaultValue={selectedSeason}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          style={{
            ...fieldStyle,
            minWidth: "200px",
          }}
        >
          {seasonFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          <Link
            href="/admin/teams"
            style={{
              display: "inline-block",
              padding: "0.75rem 1rem",
              backgroundColor: "#f8fafc",
              border: "1px solid #dbe3f0",
              borderRadius: "10px",
              color: "#475569",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Clear
          </Link>
        </div>
      )}
    </form>
  );
}