"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  id: string;
  name: string;
  description?: string | null;
};

type Team = {
  id: string;
  teamName: string;
  coachName: string;
  coachEmail: string;
  coachPhone?: string | null;
  ageGroup: string;
  season: "SPRING" | "SUMMER" | "FALL";
  year: number;
  isActive: boolean;
  requiresUmpire: boolean;
};

type Umpire = {
  id: string;
  name: string;
  doesBaseball: boolean;
  doesSoftball: boolean;
  isActive: boolean;
};

type DailyBooking = {
  id: string;
  title: string | null;
  bookingDate: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  room: {
    id: string;
    name: string;
    description?: string | null;
  };
  team: {
    id: string;
    teamName: string;
    ageGroup: string;
  } | null;
  umpireRecord?: {
    id: string;
    name: string;
  } | null;
};

type Props = {
  rooms: Room[];
  teams?: Team[];
  umpires?: Umpire[];
};

const START_HOUR = 9;
const END_HOUR = 21;
const DEFAULT_TIME = "17:00";

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
  backgroundColor: "#f8fafc",
  fontSize: "1rem",
  boxSizing: "border-box" as const,
};

const textareaStyle = {
  ...fieldStyle,
  minHeight: "110px",
  resize: "vertical" as const,
};

const durationOptions = [
  { value: "2", label: "60 min" },
  { value: "3", label: "90 min" },
  { value: "4", label: "2 hours" },
  { value: "6", label: "3 hours" },
];

const purposeOptions = ["Practice", "Scrimmage", "Game", "Other"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayString() {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeLabel(time: string) {
  const totalMinutes = timeToMinutes(time);
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

function formatMinutesLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

function buildTimeOptions() {
  const options: string[] = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    options.push(`${pad(hour)}:00`);
    options.push(`${pad(hour)}:30`);
  }
  return options;
}

function roomLabel(room: Room) {
  return room.description?.trim() ? `${room.name} (${room.description})` : room.name;
}

function formatSeasonLabel(season: Team["season"]) {
  return season.charAt(0) + season.slice(1).toLowerCase();
}

function teamLabel(team: Team) {
  return `${team.teamName} (${team.ageGroup} • ${formatSeasonLabel(team.season)} ${team.year})`;
}

function inferSport(ageGroup: string | null | undefined) {
  return ageGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
}

const timeOptions = buildTimeOptions();

export default function AdminBookingForm({ rooms, teams = [], umpires = [] }: Props) {
  const router = useRouter();

  const activeTeams = useMemo(
    () =>
      teams
        .filter((team) => team.isActive)
        .sort((a, b) => a.teamName.localeCompare(b.teamName)),
    [teams]
  );

  const activeUmpires = useMemo(
    () =>
      umpires
        .filter((umpire) => umpire.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [umpires]
  );

  const [teamId, setTeamId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState(DEFAULT_TIME);
  const [duration, setDuration] = useState("2");
  const [purpose, setPurpose] = useState("Practice");
  const [opponent, setOpponent] = useState("");
  const [notes, setNotes] = useState("");
  const [umpireId, setUmpireId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info" | "">("");
  const [dailyBookings, setDailyBookings] = useState<DailyBooking[]>([]);
  const [isLoadingDailyBookings, setIsLoadingDailyBookings] = useState(false);

  const selectedTeam = useMemo(
    () => activeTeams.find((team) => team.id === teamId) ?? null,
    [activeTeams, teamId]
  );

  const showOpponent =
    purpose === "Game" || purpose === "Scrimmage";

  const showUmpire =
    !!selectedTeam?.requiresUmpire &&
    (purpose === "Game");

  const selectedSport = inferSport(selectedTeam?.ageGroup);

  const eligibleUmpires = useMemo(() => {
    if (!showUmpire) return [];

    return activeUmpires.filter((umpire) =>
      selectedSport === "softball" ? umpire.doesSoftball : umpire.doesBaseball
    );
  }, [activeUmpires, selectedSport, showUmpire]);

  const availableDurations = useMemo(() => {
    const startMinutes = timeToMinutes(startTime);
    return durationOptions.filter((option) => {
      const endMinutes = startMinutes + Number(option.value) * 30;
      return endMinutes <= END_HOUR * 60;
    });
  }, [startTime]);

  const bookingsByRoom = useMemo(() => {
    return rooms.map((room) => ({
      room,
      bookings: dailyBookings.filter((booking) => booking.room.id === room.id),
    }));
  }, [rooms, dailyBookings]);

  useEffect(() => {
    if (activeTeams.length > 0 && !activeTeams.some((team) => team.id === teamId)) {
      setTeamId("");
    }
  }, [activeTeams, teamId]);

  useEffect(() => {
    if (!availableDurations.some((option) => option.value === duration)) {
      setDuration(availableDurations[0]?.value ?? "2");
    }
  }, [availableDurations, duration]);

  useEffect(() => {
    if (!showOpponent && opponent) {
      setOpponent("");
    }
  }, [showOpponent, opponent]);

  useEffect(() => {
    if (!showUmpire) {
      setUmpireId("");
      return;
    }

    if (umpireId && !eligibleUmpires.some((umpire) => umpire.id === umpireId)) {
      setUmpireId("");
    }
  }, [showUmpire, eligibleUmpires, umpireId]);

  useEffect(() => {
    let cancelled = false;

    async function loadDailyBookings() {
      if (!date) {
        setDailyBookings([]);
        return;
      }

      setIsLoadingDailyBookings(true);

      try {
        const response = await fetch(`/api/bookings?date=${date}`);
        const result = await response.json();

        if (!cancelled) {
          if (result.success) {
            setDailyBookings(result.bookings || []);
          } else {
            setDailyBookings([]);
          }
        }
      } catch (error) {
        console.error("Failed to load daily bookings:", error);
        if (!cancelled) {
          setDailyBookings([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDailyBookings(false);
        }
      }
    }

    loadDailyBookings();

    return () => {
      cancelled = true;
    };
  }, [date]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!teamId || !selectedTeam) {
      setMessage("Please select a team.");
      setMessageType("error");
      return;
    }

    if (!roomId) {
      setMessage("Please select a field.");
      setMessageType("error");
      return;
    }

    setMessage("Submitting booking...");
    setMessageType("info");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          roomId,
          date,
          startTime,
          durationBlocks: Number(duration),
          title: purpose,
          opponent: showOpponent ? opponent : "",
          notes,
          umpireId: showUmpire && umpireId ? umpireId : null,
        }),
      });

      const result = await response.json();

      if (result.success && result.booking?.id) {
        router.push(`/bookings/${result.booking.id}?date=${date}`);
        return;
      } else {
        setMessage(result.message || "Booking request failed.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Submit error:", error);
      setMessage("Something went wrong while submitting the booking.");
      setMessageType("error");
    }
  }

  const messageStyles =
    messageType === "success"
      ? {
          backgroundColor: "#ecfdf5",
          border: "1px solid #86efac",
          color: "#166534",
        }
      : messageType === "error"
      ? {
          backgroundColor: "#fef2f2",
          border: "1px solid #fca5a5",
          color: "#991b1b",
        }
      : {
          backgroundColor: "#eff6ff",
          border: "1px solid #93c5fd",
          color: "#1d4ed8",
        };

  return (
    <>
      <style>{`
        .booking-form-root {
          display: grid;
          gap: 1.25rem;
        }

        .booking-form-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .booking-form-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .booking-form-submit {
          padding: 0.85rem 1.25rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          width: auto;
        }

        .booking-team-card {
          border: 1px solid #dbe3f0;
          border-radius: 14px;
          padding: 1rem;
          background-color: #f8fafc;
        }

        .booking-schedule-card {
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.25rem;
          background-color: #ffffff;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
        }

        .booking-schedule-grid {
          display: grid;
          gap: 0.85rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: start;
        }

        .booking-room-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background-color: #f8fafc;
          padding: 1rem;
          min-width: 0;
        }

        .booking-room-bookings {
          display: grid;
          gap: 0.5rem;
        }

        .booking-room-booking-card {
          background-color: #ffffff;
          border: 1px solid #dbe3f0;
          border-radius: 10px;
          padding: 0.75rem 0.85rem;
          min-width: 0;
        }

        .booking-wrap-text {
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .booking-admin-banner {
          border: 1px solid #bfdbfe;
          background-color: #eff6ff;
          color: #1d4ed8;
          border-radius: 12px;
          padding: 0.9rem 1rem;
          line-height: 1.45;
          font-weight: 600;
        }

        @media (max-width: 980px) {
          .booking-form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .booking-schedule-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .booking-form-grid {
            grid-template-columns: 1fr;
            gap: 0.9rem;
          }

          .booking-form-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .booking-form-submit {
            width: 100%;
          }

          .booking-schedule-card {
            padding: 1rem;
            border-radius: 14px;
          }

          .booking-schedule-grid {
            grid-template-columns: 1fr;
          }

          .booking-room-card {
            padding: 0.9rem;
          }
        }
      `}</style>

      <form onSubmit={handleSubmit} className="booking-form-root">
        <div className="booking-admin-banner">
          This admin-only booking form can assign an umpire during booking when the selected team
          requires one and the purpose is a game.
        </div>

        <div className="booking-form-grid">
          <div>
            <label htmlFor="teamId" style={fieldLabelStyle}>
              Team
            </label>
            <select
              id="teamId"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              style={fieldStyle}
              required
              disabled={activeTeams.length === 0}
            >
              {activeTeams.length === 0 ? (
                <option value="">No active teams available</option>
              ) : (
                <>
                  <option value="">Select a team</option>
                  {activeTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {teamLabel(team)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="room" style={fieldLabelStyle}>
              Field
            </label>
            <select
              id="room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={fieldStyle}
              required
            >
              <option value="">Select a field</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {roomLabel(room)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" style={fieldLabelStyle}>
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={fieldStyle}
              required
            />
          </div>

          <div>
            <label htmlFor="startTime" style={fieldLabelStyle}>
              Start Time
            </label>
            <select
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={fieldStyle}
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {formatTimeLabel(time)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="duration" style={fieldLabelStyle}>
              Duration
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={fieldStyle}
            >
              {availableDurations.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="purpose" style={fieldLabelStyle}>
              Purpose
            </label>
            <select
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              style={fieldStyle}
            >
              {purposeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {showOpponent && (
            <div>
              <label htmlFor="opponent" style={fieldLabelStyle}>
                Opponent
              </label>
              <input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                style={fieldStyle}
              />
            </div>
          )}

          {showUmpire && (
            <div>
              <label htmlFor="umpireId" style={fieldLabelStyle}>
                Umpire
              </label>
              <select
                id="umpireId"
                value={umpireId}
                onChange={(e) => setUmpireId(e.target.value)}
                style={fieldStyle}
              >
                <option value="">Leave unassigned</option>
                {eligibleUmpires.map((umpire) => (
                  <option key={umpire.id} value={umpire.id}>
                    {umpire.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedTeam && (
          <div className="booking-team-card">
            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
              Selected Team
            </div>
            <div className="booking-wrap-text" style={{ color: "#334155" }}>
              {selectedTeam.teamName}
            </div>
            <div
              className="booking-wrap-text"
              style={{
                color: "#64748b",
                marginTop: "0.2rem",
                fontSize: "0.92rem",
                lineHeight: 1.45,
              }}
            >
              {selectedTeam.ageGroup} • {formatSeasonLabel(selectedTeam.season)} {selectedTeam.year}
            </div>
            <div
              className="booking-wrap-text"
              style={{
                color: "#64748b",
                marginTop: "0.2rem",
                fontSize: "0.92rem",
                lineHeight: 1.45,
              }}
            >
              {selectedTeam.coachName}
              {selectedTeam.coachEmail ? ` • ${selectedTeam.coachEmail}` : ""}
              {selectedTeam.coachPhone?.trim() ? ` • ${selectedTeam.coachPhone}` : ""}
            </div>
            <div
              style={{
                color: selectedTeam.requiresUmpire ? "#166534" : "#64748b",
                marginTop: "0.35rem",
                fontSize: "0.92rem",
                lineHeight: 1.45,
                fontWeight: 600,
              }}
            >
              {selectedTeam.requiresUmpire ? "This team requires an umpire." : "This team does not require an umpire."}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="notes" style={fieldLabelStyle}>
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={textareaStyle}
            placeholder="Optional details"
          />
        </div>

        <div className="booking-form-actions">
          <button
            type="submit"
            disabled={activeTeams.length === 0}
            className="booking-form-submit"
            style={{
              backgroundColor: activeTeams.length === 0 ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              cursor: activeTeams.length === 0 ? "not-allowed" : "pointer",
              boxShadow:
                activeTeams.length === 0 ? "none" : "0 4px 12px rgba(37, 99, 235, 0.22)",
            }}
          >
            Submit Booking
          </button>

          <span style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: 1.45 }}>
            Default date is today. Default time is 5:00 PM.
          </span>
        </div>

        {message && (
          <div
            style={{
              ...messageStyles,
              borderRadius: "12px",
              padding: "0.9rem 1rem",
              fontWeight: 600,
              lineHeight: 1.45,
            }}
          >
            {message}
          </div>
        )}

        <div className="booking-schedule-card">
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem", lineHeight: 1.3 }}>
            Field Schedule for {date}
          </h2>
          <p style={{ marginTop: 0, color: "#64748b", marginBottom: "1rem", lineHeight: 1.5 }}>
            This updates automatically when you choose a different date above.
          </p>

          {isLoadingDailyBookings ? (
            <div
              style={{
                padding: "1rem",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                color: "#64748b",
              }}
            >
              Loading schedule...
            </div>
          ) : (
            <div className="booking-schedule-grid">
              {bookingsByRoom.map(({ room, bookings }) => (
                <div key={room.id} className="booking-room-card">
                  <div style={{ marginBottom: "0.65rem" }}>
                    <div
                      className="booking-wrap-text"
                      style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}
                    >
                      {room.name}
                    </div>
                    {room.description?.trim() && (
                      <div
                        className="booking-wrap-text"
                        style={{
                          color: "#64748b",
                          fontSize: "0.9rem",
                          marginTop: "0.15rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {room.description}
                      </div>
                    )}
                  </div>

                  {bookings.length === 0 ? (
                    <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>
                      — No bookings for this field
                    </div>
                  ) : (
                    <div className="booking-room-bookings">
                      {bookings.map((dailyBooking) => (
                        <div key={dailyBooking.id} className="booking-room-booking-card">
                          <div
                            className="booking-wrap-text"
                            style={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}
                          >
                            {dailyBooking.title || "Booking"}
                          </div>
                          <div
                            className="booking-wrap-text"
                            style={{ color: "#334155", marginTop: "0.15rem", lineHeight: 1.4 }}
                          >
                            {dailyBooking.team?.teamName || "—"}
                          </div>
                          <div
                            style={{
                              color: "#64748b",
                              marginTop: "0.15rem",
                              fontSize: "0.92rem",
                              lineHeight: 1.4,
                            }}
                          >
                            {formatMinutesLabel(dailyBooking.startTimeMinutes)} -{" "}
                            {formatMinutesLabel(dailyBooking.endTimeMinutes)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </>
  );
}