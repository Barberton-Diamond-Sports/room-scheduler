"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  id: string;
  name: string;
  description?: string | null;
  allowGames: boolean;
  allowPractices: boolean;
  allowScrimmages: boolean;
  allowOther: boolean;
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
};

type DailyBlackout = {
  id: string;
  roomId: string;
  roomName: string;
  reason: string | null;
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
  { value: "5", label: "2.5 hours" },
  { value: "6", label: "3 hours" },
  { value: "8", label: "4 hours" },
  { value: "10", label: "5 hours" },
  { value: "12", label: "6 hours" },
  { value: "16", label: "8 hours" },
  { value: "20", label: "10 hours" },
  { value: "24", label: "12 hours" },
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

function formatMinutesLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
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

function roomAllowsPurpose(room: Room, purpose: string) {
  if (purpose === "Game") return room.allowGames;
  if (purpose === "Practice") return room.allowPractices;
  if (purpose === "Scrimmage") return room.allowScrimmages;
  if (purpose === "Other") return room.allowOther;

  return true;
}

function formatSeasonLabel(season: Team["season"]) {
  return season.charAt(0) + season.slice(1).toLowerCase();
}

function teamLabel(team: Team) {
  return `${team.teamName} (${team.ageGroup} • ${formatSeasonLabel(team.season)} ${team.year})`;
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

function sortTeamsForDropdown(a: Team, b: Team) {
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

function inferSport(ageGroup: string | null | undefined) {
  return ageGroup?.toLowerCase().includes("softball") ? "softball" : "baseball";
}

function inferBookingSport(booking: DailyBooking) {
  const ageGroup = booking.team?.ageGroup?.toLowerCase() || "";

  if (ageGroup.includes("softball")) {
    return "Softball";
  }

  if (
    ageGroup.includes("tee ball") ||
    ageGroup.includes("t-ball") ||
    ageGroup.includes("tball")
  ) {
    return "Tee Ball";
  }

  if (ageGroup.includes("baseball")) {
    return "Baseball";
  }

  return "Baseball";
}

function normalizeBookingPurpose(title: string | null | undefined) {
  const normalizedTitle = title?.trim();

  if (normalizedTitle === "Game") return "Game";
  if (normalizedTitle === "Practice") return "Practice";
  if (normalizedTitle === "Scrimmage") return "Scrimmage";
  if (normalizedTitle === "Other") return "Other";

  return normalizedTitle || "Booking";
}

function getCalendarStyleForBooking(booking: DailyBooking) {
  const sport = inferBookingSport(booking);
  const purpose = normalizeBookingPurpose(booking.title);

  if (!booking.team && purpose === "Other") {
    return {
      label: "Reserved",
      backgroundColor: "#ffffff",
      borderColor: "#dbe3f0",
      labelColor: "#475569",
    };
  }

  if (sport === "Softball") {
    if (purpose === "Game") {
      return {
        label: "Softball Game",
        backgroundColor: "#fdf2f8",
        borderColor: "#f9a8d4",
        labelColor: "#9d174d",
      };
    }

    if (purpose === "Practice") {
      return {
        label: "Softball Practice",
        backgroundColor: "#f5f3ff",
        borderColor: "#c4b5fd",
        labelColor: "#5b21b6",
      };
    }

    if (purpose === "Scrimmage") {
      return {
        label: "Softball Scrimmage",
        backgroundColor: "#faf5ff",
        borderColor: "#d8b4fe",
        labelColor: "#7e22ce",
      };
    }
  }

  if (sport === "Tee Ball") {
    if (purpose === "Game") {
      return {
        label: "Tee Ball Game",
        backgroundColor: "#f0fdf4",
        borderColor: "#86efac",
        labelColor: "#166534",
      };
    }

    if (purpose === "Practice") {
      return {
        label: "Tee Ball Practice",
        backgroundColor: "#f7fee7",
        borderColor: "#bef264",
        labelColor: "#3f6212",
      };
    }

    if (purpose === "Scrimmage") {
      return {
        label: "Tee Ball Scrimmage",
        backgroundColor: "#fefce8",
        borderColor: "#fde047",
        labelColor: "#854d0e",
      };
    }
  }

  if (purpose === "Game") {
    return {
      label: "Baseball Game",
      backgroundColor: "#eff6ff",
      borderColor: "#93c5fd",
      labelColor: "#1d4ed8",
    };
  }

  if (purpose === "Practice") {
    return {
      label: "Baseball Practice",
      backgroundColor: "#ecfeff",
      borderColor: "#67e8f9",
      labelColor: "#155e75",
    };
  }

  if (purpose === "Scrimmage") {
    return {
      label: "Baseball Scrimmage",
      backgroundColor: "#fff7ed",
      borderColor: "#fdba74",
      labelColor: "#9a3412",
    };
  }

  return {
    label: purpose,
    backgroundColor: "#ffffff",
    borderColor: "#dbe3f0",
    labelColor: "#475569",
  };
}

function getDailyBookingTeamDisplay(booking: DailyBooking) {
  if (!booking.team && booking.title?.trim() === "Other") {
    return "Reserved";
  }

  return booking.team?.teamName || "—";
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
    () => teams.filter((team) => team.isActive).sort(sortTeamsForDropdown),
    [teams]
  );

  const activeUmpires = useMemo(
    () =>
      umpires
        .filter((umpire) => umpire.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [umpires]
  );

  const [teamId, setTeamId] = useState(booking.teamId || "");
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
  const [dailyBookings, setDailyBookings] = useState<DailyBooking[]>([]);
  const [dailyBlackouts, setDailyBlackouts] = useState<DailyBlackout[]>([]);
  const [isLoadingDailyBookings, setIsLoadingDailyBookings] = useState(false);

  const selectedTeam = useMemo(
    () => activeTeams.find((team) => team.id === teamId) ?? null,
    [activeTeams, teamId]
  );

  const isTeamlessReservedBooking = purpose === "Other" && !teamId;
  const requiresTeamSelection = purpose !== "Other";

  const showOpponent = purpose === "Game" || purpose === "Scrimmage";

  const availableRooms = useMemo(() => {
    return rooms.filter((room) => roomAllowsPurpose(room, purpose));
  }, [rooms, purpose]);

  const showUmpire =
    !!selectedTeam?.requiresUmpire &&
    purpose === "Game";

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

  const blackoutByRoomId = useMemo(() => {
    const blackoutMap = new Map<string, DailyBlackout>();

    for (const blackout of dailyBlackouts) {
      blackoutMap.set(blackout.roomId, blackout);
    }

    return blackoutMap;
  }, [dailyBlackouts]);

  const bookingsByRoom = useMemo(() => {
    return rooms.map((room) => ({
      room,
      blackout: blackoutByRoomId.get(room.id) || null,
      bookings: dailyBookings.filter((dailyBooking) => dailyBooking.room.id === room.id),
    }));
  }, [rooms, dailyBookings, blackoutByRoomId]);

  useEffect(() => {
    if (teamId && activeTeams.length > 0 && !activeTeams.some((team) => team.id === teamId)) {
      setTeamId("");
    }
  }, [activeTeams, teamId]);

  useEffect(() => {
    if (roomId && !availableRooms.some((room) => room.id === roomId)) {
      setRoomId("");
    }
  }, [availableRooms, roomId]);

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
        setDailyBlackouts([]);
        return;
      }

      setIsLoadingDailyBookings(true);

      try {
        const response = await fetch(`/api/bookings?date=${date}`);
        const result = await response.json();

        if (!cancelled) {
          if (result.success) {
            setDailyBookings(result.bookings || []);
            setDailyBlackouts(result.blackouts || []);
          } else {
            setDailyBookings([]);
            setDailyBlackouts([]);
          }
        }
      } catch (error) {
        console.error("Failed to load daily bookings:", error);

        if (!cancelled) {
          setDailyBookings([]);
          setDailyBlackouts([]);
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

    if (requiresTeamSelection && (!teamId || !selectedTeam)) {
      setMessage("Please select a team, or choose Other to reserve a field without a team.");
      setMessageType("error");
      return;
    }

    if (!roomId) {
      setMessage(
        availableRooms.length === 0
          ? "No fields are available for the selected purpose."
          : "Please select a field."
      );
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
          teamId: teamId || null,
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
          ? `/bookings/${booking.id}?date=${returnDate}&view=${returnView}${
              cameFromAdmin ? "&from=admin" : ""
            }`
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

  const submitDisabled = activeTeams.length === 0 && requiresTeamSelection;

  const messageStyles =
    messageType === "success"
      ? { backgroundColor: "#ecfdf5", border: "1px solid #86efac", color: "#166534" }
      : messageType === "error"
      ? { backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" }
      : { backgroundColor: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8" };

  return (
    <>
      <style>{`
        .edit-booking-form-root {
          display: grid;
          gap: 1.25rem;
        }

        .edit-booking-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .edit-booking-schedule-card {
          border: 1px solid #dbe3f0;
          border-radius: 16px;
          padding: 1.25rem;
          background-color: #ffffff;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
        }

        .edit-booking-schedule-grid {
          display: grid;
          gap: 0.85rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: start;
        }

        .edit-booking-room-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background-color: #f8fafc;
          padding: 1rem;
          min-width: 0;
        }

        .edit-booking-room-bookings {
          display: grid;
          gap: 0.55rem;
        }

        .edit-booking-room-booking-card {
          border-radius: 10px;
          padding: 0.75rem 0.85rem;
          min-width: 0;
        }

        .edit-booking-room-blackout-card {
          background-color: #e5e7eb;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0.85rem 0.9rem;
          min-width: 0;
          color: #374151;
        }

        .edit-booking-wrap-text {
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        @media (max-width: 980px) {
          .edit-booking-schedule-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .edit-booking-grid {
            grid-template-columns: 1fr;
          }

          .edit-booking-schedule-card {
            padding: 1rem;
            border-radius: 14px;
          }

          .edit-booking-schedule-grid {
            grid-template-columns: 1fr;
          }

          .edit-booking-room-card {
            padding: 0.9rem;
          }
        }
      `}</style>

      <form onSubmit={handleSubmit} className="edit-booking-form-root">
        {booking.currentUmpireName && showUmpire && (
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
            Important: Re-select the current umpire before saving, or the umpire assignment will be
            cleared.
          </div>
        )}

        <div className="edit-booking-grid">
          <div>
            <label htmlFor="teamId" style={fieldLabelStyle}>
              Team
            </label>
            <select
              id="teamId"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              style={fieldStyle}
              required={requiresTeamSelection}
              disabled={activeTeams.length === 0 && requiresTeamSelection}
            >
              {activeTeams.length === 0 ? (
                <option value="">
                  {requiresTeamSelection
                    ? "No active teams available"
                    : "No team — Reserved field"}
                </option>
              ) : (
                <>
                  <option value="">
                    {purpose === "Other" ? "No team — Reserved field" : "Select a team"}
                  </option>
                  {activeTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {teamLabel(team)}
                    </option>
                  ))}
                </>
              )}
            </select>

            {purpose === "Other" && (
              <div
                style={{
                  marginTop: "0.4rem",
                  color: "#64748b",
                  fontSize: "0.86rem",
                  lineHeight: 1.35,
                }}
              >
                Leave team blank to make this a general reserved field booking.
              </div>
            )}
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
              disabled={availableRooms.length === 0}
            >
              <option value="">
                {availableRooms.length === 0
                  ? "No fields available for this purpose"
                  : "Select a field"}
              </option>
              {availableRooms.map((room) => (
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

        {isTeamlessReservedBooking && (
          <div
            style={{
              border: "1px solid #fca5a5",
              borderRadius: "14px",
              padding: "1rem",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              fontWeight: 700,
              lineHeight: 1.45,
            }}
          >
            Reserved field booking selected. This booking is not tied to a team and will display as
            Reserved on the calendar.
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
            disabled={submitDisabled}
            style={{
              padding: "0.85rem 1.25rem",
              backgroundColor: submitDisabled ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 600,
              cursor: submitDisabled ? "not-allowed" : "pointer",
              boxShadow: submitDisabled ? "none" : "0 4px 12px rgba(37, 99, 235, 0.22)",
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

        <div className="edit-booking-schedule-card">
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem", lineHeight: 1.3 }}>
            Field Schedule for {date}
          </h2>
          <p style={{ marginTop: 0, color: "#64748b", marginBottom: "1rem", lineHeight: 1.5 }}>
            This updates automatically when you choose a different date or purpose above.
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
            <div className="edit-booking-schedule-grid">
              {bookingsByRoom.map(({ room, blackout, bookings }) => (
                <div key={room.id} className="edit-booking-room-card">
                  <div style={{ marginBottom: "0.65rem" }}>
                    <div
                      className="edit-booking-wrap-text"
                      style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}
                    >
                      {room.name}
                    </div>

                    {room.description?.trim() && (
                      <div
                        className="edit-booking-wrap-text"
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

                  {blackout ? (
                    <div className="edit-booking-room-blackout-card">
                      <div
                        className="edit-booking-wrap-text"
                        style={{ fontWeight: 800, lineHeight: 1.35 }}
                      >
                        Field Unavailable
                      </div>
                      <div
                        className="edit-booking-wrap-text"
                        style={{ marginTop: "0.25rem", lineHeight: 1.45 }}
                      >
                        {blackout.reason?.trim() || "This field is unavailable for the full day."}
                      </div>
                    </div>
                  ) : bookings.length === 0 ? (
                    <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>
                      — No bookings for this field
                    </div>
                  ) : (
                    <div className="edit-booking-room-bookings">
                      {bookings.map((dailyBooking) => {
                        const isReservedOther =
                          !dailyBooking.team && dailyBooking.title?.trim() === "Other";

                        if (isReservedOther) {
                          return (
                            <div
                              key={dailyBooking.id}
                              className="edit-booking-room-booking-card"
                              style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #dbe3f0",
                              }}
                            >
                              <div
                                className="edit-booking-wrap-text"
                                style={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}
                              >
                                Reserved
                              </div>
                              <div
                                className="edit-booking-wrap-text"
                                style={{
                                  color: "#334155",
                                  marginTop: "0.15rem",
                                  lineHeight: 1.4,
                                }}
                              >
                                Reserved
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
                          );
                        }

                        const calendarStyle = getCalendarStyleForBooking(dailyBooking);

                        return (
                          <div
                            key={dailyBooking.id}
                            className="edit-booking-room-booking-card"
                            style={{
                              backgroundColor: calendarStyle.backgroundColor,
                              border: `1px solid ${calendarStyle.borderColor}`,
                            }}
                          >
                            <div
                              className="edit-booking-wrap-text"
                              style={{
                                fontWeight: 600,
                                lineHeight: 1.35,
                              }}
                            >
                              {calendarStyle.label}
                            </div>

                            <div
                              className="edit-booking-wrap-text"
                              style={{
                                color: "#334155",
                                marginTop: "0.15rem",
                                lineHeight: 1.4,
                                fontWeight: 700,
                              }}
                            >
                              {getDailyBookingTeamDisplay(dailyBooking)}
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
                        );
                      })}
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