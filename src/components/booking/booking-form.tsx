"use client";

import { useEffect, useMemo, useState } from "react";

type Room = {
  id: string;
  name: string;
  description?: string | null;
};

type DailyBooking = {
  id: string;
  title: string | null;
  bookedByName: string;
  bookingDate: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  teamGroup?: string | null;
  room: {
    id: string;
    name: string;
    description?: string | null;
  };
};

type Props = {
  rooms: Room[];
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

const purposeOptions = [
  "Practice",
  "Scrimmage",
  "Game",
  "Tournament",
  "Other",
];

const groupOptions = [
  "Tee Ball",
  "8U Baseball",
  "10U Baseball",
  "12U Baseball",
  "14U Baseball",
  "8U Softball",
  "10U Softball",
  "12U Softball",
  "14U Softball",
];

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
  return room.description?.trim()
    ? `${room.name} (${room.description})`
    : room.name;
}

const timeOptions = buildTimeOptions();

export default function BookingForm({ rooms }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teamGroup, setTeamGroup] = useState(groupOptions[0]);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [date, setDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState(DEFAULT_TIME);
  const [duration, setDuration] = useState("2");
  const [purpose, setPurpose] = useState("Practice");
  const [opponent, setOpponent] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info" | "">("");
  const [dailyBookings, setDailyBookings] = useState<DailyBooking[]>([]);
  const [isLoadingDailyBookings, setIsLoadingDailyBookings] = useState(false);

  const showOpponent = purpose === "Game" || purpose === "Scrimmage";

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
    setMessage("Submitting booking...");
    setMessageType("info");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          teamGroup,
          roomId,
          date,
          startTime,
          durationBlocks: Number(duration),
          title: purpose,
          opponent: showOpponent ? opponent : "",
          notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage("Booking request submitted successfully.");
        setMessageType("success");
        setName("");
        setEmail("");
        setTeamGroup(groupOptions[0]);
        setDate(getTodayString());
        setStartTime(DEFAULT_TIME);
        setDuration("2");
        setPurpose("Practice");
        setOpponent("");
        setNotes("");
        setRoomId(rooms[0]?.id ?? "");
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
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem" }}>
      <div
        style={{
          display: "grid",
          gap: "1.25rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div>
          <label htmlFor="name" style={fieldLabelStyle}>
            Team Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={fieldStyle}
            required
          />
        </div>

        <div>
          <label htmlFor="email" style={fieldLabelStyle}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="teamGroup" style={fieldLabelStyle}>
            Group
          </label>
          <select
            id="teamGroup"
            value={teamGroup}
            onChange={(e) => setTeamGroup(e.target.value)}
            style={fieldStyle}
          >
            {groupOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
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
      </div>

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
          Submit Booking
        </button>

        <span style={{ color: "#64748b", fontSize: "0.95rem" }}>
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
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          border: "1px solid #dbe3f0",
          borderRadius: "16px",
          padding: "1.25rem",
          backgroundColor: "#ffffff",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.04)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
          Field Schedule for {date}
        </h2>
        <p style={{ marginTop: 0, color: "#64748b", marginBottom: "1rem" }}>
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
          <div
			  style={{
				display: "grid",
				gap: "0.85rem",
				gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
				alignItems: "start",
			  }}
			>
			{bookingsByRoom.map(({ room, bookings }) => (

              <div
                key={room.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  backgroundColor: "#f8fafc",
                  padding: "1rem",
                }}
              >
                <div style={{ marginBottom: "0.65rem" }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{room.name}</div>
                  {room.description?.trim() && (
                    <div style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.15rem" }}>
                      {room.description}
                    </div>
                  )}
                </div>

                {bookings.length === 0 ? (
                  <div style={{ color: "#94a3b8" }}>— No bookings for this field</div>
                ) : (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {bookings.map((dailyBooking) => (
                      <div
                        key={dailyBooking.id}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #dbe3f0",
                          borderRadius: "10px",
                          padding: "0.75rem 0.85rem",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {dailyBooking.title || "Booking"}
                        </div>
                        <div style={{ color: "#334155", marginTop: "0.15rem" }}>
                          {dailyBooking.bookedByName}
                        </div>
                        <div style={{ color: "#64748b", marginTop: "0.15rem", fontSize: "0.92rem" }}>
                          {formatMinutesLabel(dailyBooking.startTimeMinutes)} -{" "}
                          {formatMinutesLabel(dailyBooking.endTimeMinutes)}
                        </div>
                        {dailyBooking.teamGroup?.trim() && (
                          <div style={{ color: "#64748b", marginTop: "0.15rem", fontSize: "0.92rem" }}>
                            {dailyBooking.teamGroup}
                          </div>
                        )}
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
  );
}
