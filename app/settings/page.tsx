"use client";

import { useEffect, useState } from "react";
import {
  type CoordinateFormat,
  DEFAULT_COORDINATE_FORMAT,
  readCoordinateFormat,
  writeCoordinateFormat
} from "../../lib/coordinates";

const coordinateOptions: Array<{
  description: string;
  label: string;
  value: CoordinateFormat;
}> = [
  {
    description: "Original INCOIS format, like 19 43 38 N.",
    label: "DMS",
    value: "dms"
  },
  {
    description: "Boat/GPS style, like 19 43.633 N.",
    label: "DDM",
    value: "ddm"
  }
];

export default function SettingsPage() {
  const [coordinateFormat, setCoordinateFormat] = useState<CoordinateFormat>(
    DEFAULT_COORDINATE_FORMAT
  );

  useEffect(() => {
    setCoordinateFormat(readCoordinateFormat());
  }, []);

  function selectCoordinateFormat(format: CoordinateFormat) {
    setCoordinateFormat(format);
    writeCoordinateFormat(format);
  }

  return (
    <main className="settingsPage">
      <header className="settingsHeader">
        <p className="sectionEyebrow">Settings</p>
        <h1>Display preferences</h1>
        <p>Saved on this device.</p>
      </header>

      <section className="settingsSection" aria-labelledby="coordinate-format">
        <div>
          <h2 id="coordinate-format">Coordinate format</h2>
          <p>Choose how spot coordinates appear in cards, map popups, and copy text.</p>
        </div>

        <div className="settingsOptions">
          {coordinateOptions.map((option) => (
            <button
              aria-pressed={coordinateFormat === option.value}
              className={`settingsOption ${
                coordinateFormat === option.value ? "active" : ""
              }`}
              key={option.value}
              onClick={() => selectCoordinateFormat(option.value)}
              type="button"
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
