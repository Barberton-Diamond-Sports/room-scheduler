"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UmpireOption = {
  id: string;
  name: string;
};

type Props = {
  umpires: UmpireOption[];
  selectedUmpireId: string;
};

const STORAGE_KEY = "umpireMyGamesSelectedUmpireId";

export default function MyGamesUmpirePicker({
  umpires,
  selectedUmpireId,
}: Props) {
  const router = useRouter();
  const [localSelectedUmpireId, setLocalSelectedUmpireId] = useState(selectedUmpireId);

  useEffect(() => {
    setLocalSelectedUmpireId(selectedUmpireId);
  }, [selectedUmpireId]);

  useEffect(() => {
    if (selectedUmpireId) {
      localStorage.setItem(STORAGE_KEY, selectedUmpireId);
      return;
    }

    const remembered = localStorage.getItem(STORAGE_KEY);
    if (!remembered) return;

    const stillExists = umpires.some((u) => u.id === remembered);
    if (!stillExists) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    router.replace(`/umpire-my-games?umpireId=${remembered}`);
  }, [selectedUmpireId, umpires, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!localSelectedUmpireId) return;

    localStorage.setItem(STORAGE_KEY, localSelectedUmpireId);
    router.push(`/umpire-my-games?umpireId=${localSelectedUmpireId}`);
  }

  function handleClear() {
    localStorage.removeItem(STORAGE_KEY);
    setLocalSelectedUmpireId("");
    router.push("/umpire-my-games");
  }

  return (
    <>
      <style>{`
        .umpire-picker-form {
          display: grid;
          gap: 1rem;
        }

        .umpire-picker-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: minmax(260px, 420px) auto;
          align-items: end;
        }

        .umpire-picker-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .umpire-picker-button {
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-weight: 700;
          border: none;
        }

        @media (max-width: 768px) {
          .umpire-picker-grid {
            grid-template-columns: 1fr;   /* ✅ stack dropdown + buttons */
          }

          .umpire-picker-buttons {
            flex-direction: column;      /* ✅ stack buttons */
            align-items: stretch;
          }

          .umpire-picker-buttons button {
            width: 100%;                 /* ✅ full-width buttons */
          }
        }
      `}</style>

      <form onSubmit={handleSubmit} className="umpire-picker-form">
        <div className="umpire-picker-grid">
          <div>
            <label
              htmlFor="umpireId"
              style={{
                display: "block",
                marginBottom: "0.35rem",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Umpire
            </label>

            <select
              id="umpireId"
              name="umpireId"
              value={localSelectedUmpireId}
              onChange={(e) => setLocalSelectedUmpireId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 0.9rem",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                backgroundColor: "#f8fafc",
                fontSize: "0.95rem",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select an umpire</option>
              {umpires.map((umpire) => (
                <option key={umpire.id} value={umpire.id}>
                  {umpire.name}
                </option>
              ))}
            </select>
          </div>

          <div className="umpire-picker-buttons">
            <button
              type="submit"
              disabled={!localSelectedUmpireId}
              className="umpire-picker-button"
              style={{
                backgroundColor: !localSelectedUmpireId ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                cursor: !localSelectedUmpireId ? "not-allowed" : "pointer",
              }}
            >
              View Games
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="umpire-picker-button"
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #dbe3f0",
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </form>
    </>
  );
}