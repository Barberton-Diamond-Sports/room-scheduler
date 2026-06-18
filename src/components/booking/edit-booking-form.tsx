

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

type Booking = {
  id: string;
  roomId: string;
  teamId: string;
  bookingDate: string;
  startTimeMinutes: number;
  durationBlocks: number;
  title: string | null;
  notes: string | null;
  opponent?: string | null;
  umpireId?: string;
  currentUmpireName?: string | null;
};

type Props = {
  rooms: Room[];
  teams: Team[];
  umpires: Umpire[];
  booking: Booking;
  returnDate?: string;
  returnView?: "day" | "week";
  cameFromAdmin?: boolean;
};

const START_HOUR = 9;
const END_HOUR = 21;

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

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

function formatTimeLabel(time: string) {
  const [hoursString, minutesString] = time.split(":");
  const hours24 = Number(hoursString);
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${minutesString} ${suffix}`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function dateToInputValue(dateString: string) {
  return dateString;
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
  return room.description?.trim()
    ? `${room.name} (${room.description})`
    : room.name;
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

export default function EditBookingForm({
  rooms,
  teams,
  umpires,
  booking,
  returnDate,
  returnView = "day",
  cameFromAdmin = false,
}: Props) {
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

  const [teamId, setTeamId] = useState(booking.teamId || activeTeams[0]?.id || "");
  const [roomId, setRoomId] = useState(booking.roomId);
  const [date, setDate] = useState(dateToInputValue(booking.bookingDate));
  const [startTime, setStartTime] = useState(minutesToTime(booking.startTimeMinutes));
  const [duration, setDuration] = useState(String(booking.durationBlocks));
  const [purpose, setPurpose] = useState(booking.title || "Practice");
  const [opponent, setOpponent] = useState(booking.opponent || "");
  const [notes, setNotes] = useState(booking.notes || "");
  const [umpireId, setUmpireId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info" | "">("");

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
    return durationOptions.filter(
      (option) => startMinutes + Number(option.value) * 30 <= END_HOUR * 60
    );
  }, [startTime]);

  useEffect(() => {
    if (activeTeams.length > 0 && !activeTeams.some((team) => team.id === teamId)) {
      setTeamId(activeTeams[0].id);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!teamId || !selectedTeam) {
      setMessage("Please select a team.");
      setMessageType("error");
      return;
    }

    setMessage("Saving changes...");
    setMessageType("info");

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

      if (result.success) {
        setMessage("Booking updated successfully.");
        setMessageType("success");
		
		const destination = returnDate
		  ? `/bookings/${booking.id}?date=${returnDate}&view=${returnView}${cameFromAdmin ? "&from=admin" : ""}`
		  : `/bookings/${booking.id}?view=${returnView}${cameFromAdmin ? "&from=admin" : ""}`;
  
        router.push(destination);
        router.refresh();
      } else {
        setMessage(result.message || "Booking update failed.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage("Something went wrong while updating the booking.");
      setMessageType("error");
    }
  }

  const messageStyles =
    messageType === "success"
      ? { backgroundColor: "#ecfdf5", border: "1px solid #86efac", color: "#166534" }
      : messageType === "error"
      ? { backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" }
      : { backgroundColor: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8" };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem" }}>
      {booking.currentUmpireName && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            borderRadius: "12px",
            padding: "0.9rem 1rem",
            fontWeight: 700,
            lineHeight: 1.45,
          }}
        >
          Important: Re-select the current umpire before saving, or the umpire assignment will be cleared.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "1.25rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
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
              activeTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {teamLabel(team)}
                </option>
              ))
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
          >
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

            {booking.currentUmpireName && (
              <div
                style={{
                  marginBottom: "0.35rem",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "#334155",
                  lineHeight: 1.35,
                }}
              >
                Scheduled: {booking.currentUmpireName}
              </div>
            )}

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
        <div
          style={{
            border: "1px solid #dbe3f0",
            borderRadius: "14px",
            padding: "1rem",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
            Selected Team
          </div>
          <div style={{ color: "#334155" }}>{selectedTeam.teamName}</div>
          <div style={{ color: "#64748b", marginTop: "0.2rem", fontSize: "0.92rem" }}>
            {selectedTeam.ageGroup} • {formatSeasonLabel(selectedTeam.season)} {selectedTeam.year}
          </div>
          <div style={{ color: "#64748b", marginTop: "0.2rem", fontSize: "0.92rem" }}>
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
            {selectedTeam.requiresUmpire
              ? "This team requires an umpire."
              : "This team does not require an umpire."}
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

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={activeTeams.length === 0}
          style={{
            padding: "0.85rem 1.25rem",
            backgroundColor: activeTeams.length === 0 ? "#94a3b8" : "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontWeight: 600,
            cursor: activeTeams.length === 0 ? "not-allowed" : "pointer",
            boxShadow: activeTeams.length === 0 ? "none" : "0 4px 12px rgba(37, 99, 235, 0.22)",
          }}
        >
          Save Changes
        </button>
      </div>

      {message && (
        <div
          style={{
            ...messageStyles,
            borderRadius: "12px",
            padding: "0.9rem 1rem",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}