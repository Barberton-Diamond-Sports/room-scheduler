import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import TeamFilters from "@/components/admin/team-filters";
import AdminNav from "@/components/admin/admin-nav";

const ageGroupOptions = [
  "8U Baseball",
  "10U Baseball",
  "12U Baseball",
  "14U Baseball",
  "8U Softball",
  "10U Softball",
  "12U Softball",
  "14U Softball",
  "Tee Ball",
] as const;

const seasonOptions = [
  { value: "SPRING", label: "Spring" },
  { value: "SUMMER", label: "Summer" },
  { value: "FALL", label: "Fall" },
] as const;

type TeamSeasonValue = "SPRING" | "SUMMER" | "FALL";
type StatusFilterValue = "all" | "active" | "inactive";
type SportFilterValue = "all" | "baseball" | "softball" | "tee-ball";

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

function getEasternTodayValue() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatSeason(season: TeamSeasonValue) {
  return season.charAt(0) + season.slice(1).toLowerCase();
}

function textOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : "—";
}

function statusBadge(isActive: boolean) {
  return {
    display: "inline-block",
    padding: "0.3rem 0.65rem",
    borderRadius: "999px",
    fontSize: "0.82rem",
    fontWeight: 700,
    border: isActive ? "1px solid #86efac" : "1px solid #cbd5e1",
    backgroundColor: isActive ? "#ecfdf5" : "#f8fafc",
    color: isActive ? "#166534" : "#475569",
  } as const;
}

function getTeamSportSortOrder(ageGroup: string) {
  const normalizedAgeGroup = ageGroup.toLowerCase();

  if (normalizedAgeGroup.includes("baseball")) {
    return 1;
  }

  if (normalizedAgeGroup.includes("softball")) {
    return 2;
  }

  if (
    normalizedAgeGroup.includes("tee ball") ||
    normalizedAgeGroup.includes("t-ball") ||
    normalizedAgeGroup.includes("tball")
  ) {
    return 3;
  }

  return 4;
}

function getTeamSportFilterValue(ageGroup: string): SportFilterValue {
  const normalizedAgeGroup = ageGroup.toLowerCase();

  if (normalizedAgeGroup.includes("baseball")) {
    return "baseball";
  }

  if (normalizedAgeGroup.includes("softball")) {
    return "softball";
  }

  if (
    normalizedAgeGroup.includes("tee ball") ||
    normalizedAgeGroup.includes("t-ball") ||
    normalizedAgeGroup.includes("tball")
  ) {
    return "tee-ball";
  }

  return "all";
}

function sortTeamsForDisplay<
  T extends {
    isActive: boolean;
    year: number;
    season: TeamSeasonValue;
    ageGroup: string;
    teamName: string;
  }
>(a: T, b: T) {
  if (a.isActive !== b.isActive) {
    return a.isActive ? -1 : 1;
  }

  const sportCompare =
    getTeamSportSortOrder(a.ageGroup) - getTeamSportSortOrder(b.ageGroup);

  if (sportCompare !== 0) {
    return sportCompare;
  }

  const yearCompare = b.year - a.year;

  if (yearCompare !== 0) {
    return yearCompare;
  }

  const seasonCompare = a.season.localeCompare(b.season);

  if (seasonCompare !== 0) {
    return seasonCompare;
  }

  const ageGroupCompare = a.ageGroup.localeCompare(b.ageGroup, undefined, {
    numeric: true,
    sensitivity: "base",
  });

  if (ageGroupCompare !== 0) {
    return ageGroupCompare;
  }

  return a.teamName.localeCompare(b.teamName, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function buildTeamsHref(
  status: StatusFilterValue,
  season: string,
  sport: SportFilterValue,
  extra?: { edit?: string; confirmDelete?: string }
) {
  const params = new URLSearchParams();

  if (status !== "all") {
    params.set("status", status);
  }

  if (season !== "all") {
    params.set("season", season);
  }
  
  if (sport !== "all") {
	params.set("sport", sport);
  }

  if (extra?.edit) {
    params.set("edit", extra.edit);
  }

  if (extra?.confirmDelete) {
    params.set("confirmDelete", extra.confirmDelete);
  }

  const query = params.toString();
  return query ? `/admin/teams?${query}` : "/admin/teams";
}

export default async function ManageTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    confirmDelete?: string;
    status?: string;
    season?: string;
	sport?: string;
  }>;
}) {
  async function addTeam(formData: FormData) {
    "use server";

    const teamName = String(formData.get("teamName") || "").trim();
    const coachName = String(formData.get("coachName") || "").trim();
    const coachEmail = String(formData.get("coachEmail") || "").trim();
    const coachPhone = String(formData.get("coachPhone") || "").trim();
    const ageGroup = String(formData.get("ageGroup") || "").trim();
    const season = String(formData.get("season") || "").trim() as TeamSeasonValue;
    const yearRaw = String(formData.get("year") || "").trim();
    const year = Number(yearRaw);
	const requiresUmpire = formData.get("requiresUmpire") === "on";
    const returnStatus = String(formData.get("returnStatus") || "all").trim() as StatusFilterValue;
    const returnSeason = String(formData.get("returnSeason") || "all").trim();

    if (!teamName || !coachName || !coachEmail || !ageGroup || !season || !yearRaw) {
      return;
    }

    if (!["SPRING", "SUMMER", "FALL"].includes(season)) {
      return;
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return;
    }

    await prisma.team.create({
      data: {
        teamName,
        coachName,
        coachEmail,
        coachPhone: coachPhone || null,
        ageGroup,
        season,
        year,
        isActive: true,
		requiresUmpire,
      },
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin");
    const returnSport = String(formData.get("returnSport") || "all").trim() as SportFilterValue;

redirect(buildTeamsHref(returnStatus, returnSeason, returnSport));
  }

  async function updateTeam(formData: FormData) {
    "use server";

    const teamId = String(formData.get("teamId") || "").trim();
    const teamName = String(formData.get("teamName") || "").trim();
    const coachName = String(formData.get("coachName") || "").trim();
    const coachEmail = String(formData.get("coachEmail") || "").trim();
    const coachPhone = String(formData.get("coachPhone") || "").trim();
    const ageGroup = String(formData.get("ageGroup") || "").trim();
    const season = String(formData.get("season") || "").trim() as TeamSeasonValue;
    const yearRaw = String(formData.get("year") || "").trim();
    const year = Number(yearRaw);
	const requiresUmpire = formData.get("requiresUmpire") === "on";

    const returnStatus = String(formData.get("returnStatus") || "all").trim() as StatusFilterValue;
    const returnSeason = String(formData.get("returnSeason") || "all").trim();

    if (!teamId || !teamName || !coachName || !coachEmail || !ageGroup || !season || !yearRaw) {
      return;
    }

    if (!["SPRING", "SUMMER", "FALL"].includes(season)) {
      return;
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return;
    }

    await prisma.team.update({
      where: { id: teamId },
      data: {
        teamName,
        coachName,
        coachEmail,
        coachPhone: coachPhone || null,
        ageGroup,
        season,
        year,
		requiresUmpire,
      },
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin");
const returnSport = String(formData.get("returnSport") || "all").trim() as SportFilterValue;

redirect(buildTeamsHref(returnStatus, returnSeason, returnSport));
  }

  async function deactivateTeam(formData: FormData) {
    "use server";

    const teamId = String(formData.get("teamId") || "").trim();
    const returnStatus = String(formData.get("returnStatus") || "all").trim() as StatusFilterValue;
    const returnSeason = String(formData.get("returnSeason") || "all").trim();

    if (!teamId) return;

    await prisma.team.update({
      where: { id: teamId },
      data: { isActive: false },
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin");
const returnSport = String(formData.get("returnSport") || "all").trim() as SportFilterValue;

redirect(buildTeamsHref(returnStatus, returnSeason, returnSport));
  }

  async function activateTeam(formData: FormData) {
    "use server";

    const teamId = String(formData.get("teamId") || "").trim();
    const returnStatus = String(formData.get("returnStatus") || "all").trim() as StatusFilterValue;
    const returnSeason = String(formData.get("returnSeason") || "all").trim();

    if (!teamId) return;

    await prisma.team.update({
      where: { id: teamId },
      data: { isActive: true },
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin");
    const returnSport = String(formData.get("returnSport") || "all").trim() as SportFilterValue;

redirect(buildTeamsHref(returnStatus, returnSeason, returnSport));
  }

  async function deleteTeam(formData: FormData) {
    "use server";

    const teamId = String(formData.get("teamId") || "").trim();
    const returnStatus = String(formData.get("returnStatus") || "all").trim() as StatusFilterValue;
    const returnSeason = String(formData.get("returnSeason") || "all").trim();

    if (!teamId) return;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { isActive: true },
    });

    if (!team || team.isActive) {
      return;
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    revalidatePath("/admin/teams");
    revalidatePath("/admin");
    const returnSport = String(formData.get("returnSport") || "all").trim() as SportFilterValue;

redirect(buildTeamsHref(returnStatus, returnSeason, returnSport));
  }

  const params = await searchParams;
  const editingTeamId = params.edit || "";
  const confirmDeleteTeamId = params.confirmDelete || "";
  const currentYear = new Date().getFullYear();
  const todayValue = getEasternTodayValue();
  const selectedStatus: StatusFilterValue =
    params.status === "all" || params.status === "inactive" ? params.status : "active";

  const selectedSport: SportFilterValue =
	params.sport === "baseball" ||
	params.sport === "softball" ||
	params.sport === "tee-ball"
	  ? params.sport
	  : "all";

  const recentSeasonTeams = await prisma.team.findMany({
    where: {
      year: {
        in: [currentYear, currentYear - 1],
      },
    },
    select: {
      year: true,
      season: true,
    },
    distinct: ["year", "season"],
  });

  const seasonSortOrder: Record<TeamSeasonValue, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };

  const seasonFilterOptions = [
    { value: "all", label: "All seasons" },
    ...recentSeasonTeams
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return seasonSortOrder[a.season] - seasonSortOrder[b.season];
      })
      .map((item) => ({
        value: `${item.year}-${item.season}`,
        label: `${item.year} ${formatSeason(item.season)}`,
      })),
  ];

  const validSeasonValues = new Set(seasonFilterOptions.map((option) => option.value));
  const selectedSeason = validSeasonValues.has(params.season || "") ? (params.season as string) : "all";

  const hasActiveFilters =
	selectedStatus !== "active" || selectedSeason !== "all" || selectedSport !== "all";

  const filterWhere: {
    isActive?: boolean;
    year?: number;
    season?: TeamSeasonValue;
  } = {};

  if (selectedStatus === "active") {
    filterWhere.isActive = true;
  } else if (selectedStatus === "inactive") {
    filterWhere.isActive = false;
  }

  if (selectedSeason !== "all") {
    const [yearPart, seasonPart] = selectedSeason.split("-");
    const parsedYear = Number(yearPart);

    if (
      Number.isInteger(parsedYear) &&
      ["SPRING", "SUMMER", "FALL"].includes(seasonPart)
    ) {
      filterWhere.year = parsedYear;
      filterWhere.season = seasonPart as TeamSeasonValue;
    }
  }

	const [teamsRaw, totalTeams, activeCount, inactiveCount] = await Promise.all([
	  prisma.team.findMany({
		where: filterWhere,
		orderBy: [
		  { isActive: "desc" },
		  { year: "desc" },
		  { season: "asc" },
		  { ageGroup: "asc" },
		  { teamName: "asc" },
		],
	  }),
    prisma.team.count(),
    prisma.team.count({ where: { isActive: true } }),
    prisma.team.count({ where: { isActive: false } }),
  ]);

	const teams = teamsRaw
	  .filter((team) => {
		if (selectedSport === "all") {
		  return true;
		}

		return getTeamSportFilterValue(team.ageGroup) === selectedSport;
	  })
	  .sort(sortTeamsForDisplay);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
	<style>{`
	  .team-card-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(260px, 1.3fr) minmax(240px, 1fr) 180px;
		align-items: start;
	  }

	  .team-actions {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	  }

	  @media (max-width: 768px) {		
		.team-card-grid {
		  grid-template-columns: 1fr; /* ✅ stacks everything */
		  gap: 0.75rem;
		}

		.team-actions {
		  flex-direction: column;
		}

		.team-actions a,
		.team-actions button {
		  width: 100%;
		}
	  }
	`}</style>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "start",
            }}
          >
            <div>
              <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.9rem" }}>Manage Teams</h1>
              <p style={{ marginTop: 0, color: "#4b5563", marginBottom: 0 }}>
                Add, edit, inactivate, reactivate, and delete teams stored in the system.
              </p>
            </div>

            
          </div>
		  <div style={{ marginTop: "1rem" }}>
			<AdminNav todayValue={todayValue} />
		  </div>
        </div>
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Add Team</h2>

          <form action={addTeam} style={{ display: "grid", gap: "1rem" }}>
            <input type="hidden" name="returnStatus" value={selectedStatus} />
            <input type="hidden" name="returnSeason" value={selectedSeason} />
			<input type="hidden" name="returnSport" value={selectedSport} />

            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <div>
                <label htmlFor="teamName" style={fieldLabelStyle}>
                  Team Name
                </label>
                <input id="teamName" name="teamName" required style={fieldStyle} />
              </div>

              <div>
                <label htmlFor="coachName" style={fieldLabelStyle}>
                  Coach Name
                </label>
                <input id="coachName" name="coachName" required style={fieldStyle} />
              </div>

              <div>
                <label htmlFor="coachEmail" style={fieldLabelStyle}>
                  Coach E-mail
                </label>
                <input
                  id="coachEmail"
                  name="coachEmail"
                  type="email"
                  required
                  style={fieldStyle}
                />
              </div>

              <div>
                <label htmlFor="coachPhone" style={fieldLabelStyle}>
                  Coach Phone
                </label>
                <input id="coachPhone" name="coachPhone" type="tel" style={fieldStyle} />
              </div>

              <div>
                <label htmlFor="ageGroup" style={fieldLabelStyle}>
                  Age Group
                </label>
                <select
                  id="ageGroup"
                  name="ageGroup"
                  required
                  defaultValue=""
                  style={fieldStyle}
                >
                  <option value="" disabled>
                    Select age group
                  </option>
                  {ageGroupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="season" style={fieldLabelStyle}>
                  Season
                </label>
                <select
                  id="season"
                  name="season"
                  required
                  defaultValue="SPRING"
                  style={fieldStyle}
                >
                  {seasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="year" style={fieldLabelStyle}>
                  Year
                </label>
                <input
                  id="year"
                  name="year"
                  type="number"
                  required
                  defaultValue={currentYear}
                  min={2000}
                  max={2100}
                  style={fieldStyle}
                />
              </div>
			  <div style={{ marginTop: "0.5rem" }}>
			    <label
				  style={{
				    display: "flex",
				    alignItems: "center",
				    gap: "0.5rem",
				    fontWeight: 600,
				    color: "#334155",
				    cursor: "pointer",
				  }}
			    >
				  <input
				    type="checkbox"
				    name="requiresUmpire"
				    defaultChecked={true}
				    style={{ width: "16px", height: "16px" }}
				  />
				  Requires Umpire
			    </label>
			  </div>
            </div>

            <div>
              <button
                type="submit"
                style={{
                  padding: "0.85rem 1.25rem",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.22)",
                }}
              >
                Add Team
              </button>
            </div>
          </form>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #dbe3f0",
              borderRadius: "16px",
              padding: "1.25rem",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              Total Teams
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>
              {totalTeams}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #dbe3f0",
              borderRadius: "16px",
              padding: "1.25rem",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              Active Teams
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>
              {activeCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #dbe3f0",
              borderRadius: "16px",
              padding: "1.25rem",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              Inactive Teams
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>
              {inactiveCount}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #dbe3f0",
            borderRadius: "16px",
            padding: "1.5rem",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "end",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Team List</h2>
              <div style={{ color: "#64748b" }}>
                Showing {teams.length} matching teams
              </div>
            </div>

            <TeamFilters
			  selectedStatus={selectedStatus}
			  selectedSeason={selectedSeason}
			  selectedSport={selectedSport}
			  seasonFilterOptions={seasonFilterOptions}
			  hasActiveFilters={hasActiveFilters}
			/>
          </div>

          {teams.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                color: "#64748b",
              }}
            >
              No teams match the current filters.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {teams.map((team) => {
                const isEditing = editingTeamId === team.id;
                const isConfirmingDelete = confirmDeleteTeamId === team.id;

                return (
                  <div
				    id={`team-${team.id}`}
                    key={team.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      backgroundColor: team.isActive ? "#f8fafc" : "#f1f5f9",
                      padding: "1rem",
                    }}
                  >
                    {isEditing ? (
                      <form action={updateTeam} style={{ display: "grid", gap: "1rem" }}>
                        <input type="hidden" name="teamId" value={team.id} />
                        <input type="hidden" name="returnStatus" value={selectedStatus} />
                        <input type="hidden" name="returnSeason" value={selectedSeason} />
						<input type="hidden" name="returnSport" value={selectedSport} />

                        <div
                          style={{
                            display: "grid",
                            gap: "1rem",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          }}
                        >
                          <div>
                            <label htmlFor={`teamName-${team.id}`} style={fieldLabelStyle}>
                              Team Name
                            </label>
                            <input
                              id={`teamName-${team.id}`}
                              name="teamName"
                              required
                              defaultValue={team.teamName}
                              style={fieldStyle}
                            />
                          </div>

                          <div>
                            <label htmlFor={`coachName-${team.id}`} style={fieldLabelStyle}>
                              Coach Name
                            </label>
                            <input
                              id={`coachName-${team.id}`}
                              name="coachName"
                              required
                              defaultValue={team.coachName}
                              style={fieldStyle}
                            />
                          </div>

                          <div>
                            <label htmlFor={`coachEmail-${team.id}`} style={fieldLabelStyle}>
                              Coach E-mail
                            </label>
                            <input
                              id={`coachEmail-${team.id}`}
                              name="coachEmail"
                              type="email"
                              required
                              defaultValue={team.coachEmail}
                              style={fieldStyle}
                            />
                          </div>

                          <div>
                            <label htmlFor={`coachPhone-${team.id}`} style={fieldLabelStyle}>
                              Coach Phone
                            </label>
                            <input
                              id={`coachPhone-${team.id}`}
                              name="coachPhone"
                              type="tel"
                              defaultValue={team.coachPhone || ""}
                              style={fieldStyle}
                            />
                          </div>

                          <div>
                            <label htmlFor={`ageGroup-${team.id}`} style={fieldLabelStyle}>
                              Age Group
                            </label>
                            <select
                              id={`ageGroup-${team.id}`}
                              name="ageGroup"
                              required
                              defaultValue={team.ageGroup}
                              style={fieldStyle}
                            >
                              {ageGroupOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor={`season-${team.id}`} style={fieldLabelStyle}>
                              Season
                            </label>
                            <select
                              id={`season-${team.id}`}
                              name="season"
                              required
                              defaultValue={team.season}
                              style={fieldStyle}
                            >
                              {seasonOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor={`year-${team.id}`} style={fieldLabelStyle}>
                              Year
                            </label>
                            <input
                              id={`year-${team.id}`}
                              name="year"
                              type="number"
                              required
                              defaultValue={team.year}
                              min={2000}
                              max={2100}
                              style={fieldStyle}
                            />
                          </div>
						  
<div style={{ marginTop: "0.5rem" }}>
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      fontWeight: 600,
      color: "#334155",
      cursor: "pointer",
    }}
  >
    <input
      type="checkbox"
      name="requiresUmpire"
      defaultChecked={team.requiresUmpire}
      style={{ width: "16px", height: "16px" }}
    />
    Requires Umpire
  </label>
</div>

                        </div>

                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                          <button
                            type="submit"
                            style={{
                              padding: "0.8rem 1.2rem",
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Save Changes
                          </button>

                          <Link
                            href={buildTeamsHref(selectedStatus, selectedSeason, selectedSport)}
                            style={{
                              display: "inline-block",
                              padding: "0.8rem 1.2rem",
                              backgroundColor: "#f8fafc",
                              border: "1px solid #dbe3f0",
                              borderRadius: "12px",
                              color: "#475569",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            Cancel
                          </Link>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="team-card-grid">
                          <div>
                            <div
                              style={{
                                display: "flex",
                                gap: "0.6rem",
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "1rem" }}>
                                {team.teamName}
                              </div>
                              <span style={statusBadge(team.isActive)}>
                                {team.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>

                            <div style={{ color: "#475569", marginTop: "0.2rem" }}>
                              {team.ageGroup} · {formatSeason(team.season)} {team.year}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gap: "0.3rem",
                              color: "#0f172a",
                              fontWeight: 600,
                              alignContent: "start",
                            }}
                          >
                            <div>{team.coachName}</div>
                            <div>{team.coachEmail}</div>
                            <div>{textOrDash(team.coachPhone)}</div>
                          </div>

                          <div className="team-actions">
                            
<Link
  href={`${buildTeamsHref(selectedStatus, selectedSeason, selectedSport, { edit: team.id })}#team-${team.id}`}


                              style={{
                                display: "block",
                                width: "100%",
                                padding: "0.7rem 1rem",
                                backgroundColor: "#dbeafe",
                                border: "1px solid #93c5fd",
                                borderRadius: "10px",
                                color: "#1d4ed8",
                                textDecoration: "none",
                                fontWeight: 600,
                                textAlign: "center",
                              }}
                            >
                              Edit
                            </Link>

                            {team.isActive ? (
                              <form action={deactivateTeam}>
                                <input type="hidden" name="teamId" value={team.id} />
                                <input type="hidden" name="returnStatus" value={selectedStatus} />
                                <input type="hidden" name="returnSeason" value={selectedSeason} />
								<input type="hidden" name="returnSport" value={selectedSport} />
                                <button
                                  type="submit"
                                  style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    backgroundColor: "#fef3c7",
                                    border: "1px solid #facc15",
                                    borderRadius: "10px",
                                    color: "#92400e",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Make Inactive
                                </button>
                              </form>
                            ) : (
                              <>
                                <form action={activateTeam}>
                                  <input type="hidden" name="teamId" value={team.id} />
                                  <input type="hidden" name="returnStatus" value={selectedStatus} />
                                  <input type="hidden" name="returnSeason" value={selectedSeason} />
								  <input type="hidden" name="returnSport" value={selectedSport} />
                                  <button
                                    type="submit"
                                    style={{
                                      width: "100%",
                                      padding: "0.7rem 1rem",
                                      backgroundColor: "#ecfccb",
                                      border: "1px solid #bef264",
                                      borderRadius: "10px",
                                      color: "#3f6212",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Make Active
                                  </button>
                                </form>

                                <Link
                                  href={buildTeamsHref(selectedStatus, selectedSeason, selectedSport, {
                                    confirmDelete: team.id,
                                  })}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    backgroundColor: "#fee2e2",
                                    border: "1px solid #fca5a5",
                                    borderRadius: "10px",
                                    color: "#991b1b",
                                    textDecoration: "none",
                                    fontWeight: 600,
                                    textAlign: "center",
                                  }}
                                >
                                  Delete
                                </Link>
                              </>
                            )}
                          </div>
                        </div>

                        {isConfirmingDelete && !team.isActive && (
                          <div
                            style={{
                              marginTop: "1rem",
                              padding: "1rem",
                              border: "1px solid #fca5a5",
                              borderRadius: "12px",
                              backgroundColor: "#fff1f2",
                            }}
                          >
                            <div style={{ color: "#991b1b", fontWeight: 700, marginBottom: "0.5rem" }}>
                              Are you sure you want to permanently delete this inactive team?
                            </div>
                            <div style={{ color: "#7f1d1d", marginBottom: "0.9rem" }}>
                              This action cannot be undone.
                            </div>

                            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                              <form action={deleteTeam}>
                                <input type="hidden" name="teamId" value={team.id} />
                                <input type="hidden" name="returnStatus" value={selectedStatus} />
                                <input type="hidden" name="returnSeason" value={selectedSeason} />
								<input type="hidden" name="returnSport" value={selectedSport} />
                                <button
                                  type="submit"
                                  style={{
                                    padding: "0.75rem 1rem",
                                    backgroundColor: "#b91c1c",
                                    border: "1px solid #991b1b",
                                    borderRadius: "10px",
                                    color: "#ffffff",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Yes, Delete Team
                                </button>
                              </form>

                              <Link
                                href={buildTeamsHref(selectedStatus, selectedSeason, selectedSport)}
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
                                Cancel
                              </Link>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}