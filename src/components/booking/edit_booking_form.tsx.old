
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  id: string;
  name: string;
};

type Booking = {
  id: string;
  roomId: string;
  bookingDate: string;
  startTimeMinutes: number;
  durationBlocks: number;
  bookedByName: string;
  bookedByEmail: string | null;
  title: string | null;
  notes: string | null;
};

type Props = {
  rooms: Room[];
  booking: Booking;
  returnDate?: string;
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
  return dateString.slice(0, 10);
}

function buildTimeOptions() {
  const options: string[] = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    options.push(`${pad(hour)}:00`);
    options.push(`${pad(hour)}:30`);
  }
  return options;
}

const timeOptions = buildTimeOptions();

export default function EditBookingForm({ rooms, booking, returnDate }: Props) {
  const router = useRouter();
  const [name, setName] = useState(booking.bookedByName);
  const [email, setEmail] = useState(booking.bookedByEmail || "");
  const [roomId, setRoomId] = useState(booking.roomId);
  const [date, setDate] = useState(dateToInputValue(booking.bookingDate));
  const [startTime, setStartTime] = useState(minutesToTime(booking.startTimeMinutes));
  const [duration, setDuration] = useState(String(booking.durationBlocks));
  const [purpose, setPurpose] = useState(booking.title || "Practice");
  const [notes, setNotes] = useState(booking.notes || "");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info" | "">("");

  const availableDurations = useMemo(() => {
    const startMinutes = timeToMinutes(startTime);
    return durationOptions.filter((option) => {
      const endMinutes = startMinutes + Number(option.value) * 30;
      return endMinutes <= END_HOUR * 60;
    });
  }, [startTime]);

  useEffect(() => {
    if (!availableDurations.some((option) => option.value === duration)) {
      setDuration(availableDurations[0]?.value ?? "2");
    }
  }, [availableDurations, duration]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("Saving changes...");
    setMessageType("info");

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          roomId,
          date,
          startTime,
          durationBlocks: Number(duration),
          title: purpose,
          notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage("Booking updated successfully.");
        setMessageType("success");
        const destination = returnDate
          ? `/bookings/${booking.id}?date=${returnDate}`
          : `/bookings/${booking.id}`;
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
          <label htmlFor="name" style={fieldLabelStyle}>Your Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} required />
        </div>

        <div>
          <label htmlFor="email" style={fieldLabelStyle}>E-mail</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
        </div>

        <div>
          <label htmlFor="room" style={fieldLabelStyle}>Field</label>
          <select id="room" value={roomId} onChange={(e) => setRoomId(e.target.value)} style={fieldStyle}>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" style={fieldLabelStyle}>Date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} required />
        </div>

        <div>
          <label htmlFor="startTime" style={fieldLabelStyle}>Start Time</label>
          <select id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={fieldStyle}>
            {timeOptions.map((time) => (
              <option key={time} value={time}>{formatTimeLabel(time)}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="duration" style={fieldLabelStyle}>Duration</label>
          <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} style={fieldStyle}>
            {availableDurations.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="purpose" style={fieldLabelStyle}>Purpose</label>
          <select id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} style={fieldStyle}>
            {purposeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" style={fieldLabelStyle}>Notes</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} style={textareaStyle} placeholder="Optional details" />
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
          Save Changes
        </button>
      </div>

      {message && (
        <div style={{ ...messageStyles, borderRadius: "12px", padding: "0.9rem 1rem", fontWeight: 600 }}>
          {message}
        </div>
      )}
    </form>
  );
}
