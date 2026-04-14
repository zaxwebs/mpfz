"use client";

import { useEffect, useState } from "react";
import {
  type CoordinateFormat,
  DEFAULT_COORDINATE_FORMAT,
  readCoordinateFormat,
  writeCoordinateFormat
} from "../../lib/coordinates";
import {
  type DepthUnit,
  DEFAULT_DEPTH_UNIT,
  readDepthUnit,
  writeDepthUnit
} from "../../lib/depthUnits";

const coordinateOptions: Array<{
  description: string;
  label: string;
  value: CoordinateFormat;
}> = [
  {
    description: "Degrees, minutes, and seconds, like 19 43 38 N.",
    label: "DMS",
    value: "dms"
  },
  {
    description: "Degrees and decimal minutes, like 19 43.633 N.",
    label: "DDM",
    value: "ddm"
  }
];

const depthOptions: Array<{
  description: string;
  label: string;
  value: DepthUnit;
}> = [
  {
    description: "Metric depth values, shown as metres.",
    label: "Meters",
    value: "meters"
  },
  {
    description: "Marine depth values, where 1 fathom is about 1.83 m.",
    label: "Fathoms",
    value: "fathoms"
  }
];

export default function SettingsPage() {
  const [coordinateFormat, setCoordinateFormat] = useState<CoordinateFormat>(
    DEFAULT_COORDINATE_FORMAT
  );
  const [depthUnit, setDepthUnit] = useState<DepthUnit>(DEFAULT_DEPTH_UNIT);

  useEffect(() => {
    setCoordinateFormat(readCoordinateFormat());
    setDepthUnit(readDepthUnit());
  }, []);

  function selectCoordinateFormat(format: CoordinateFormat) {
    setCoordinateFormat(format);
    writeCoordinateFormat(format);
  }

  function selectDepthUnit(unit: DepthUnit) {
    setDepthUnit(unit);
    writeDepthUnit(unit);
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

      <section className="settingsSection" aria-labelledby="depth-unit">
        <div>
          <h2 id="depth-unit">Depth unit</h2>
          <p>Choose how water depth appears in cards, map popups, and copy text.</p>
        </div>

        <div className="settingsOptions">
          {depthOptions.map((option) => (
            <button
              aria-pressed={depthUnit === option.value}
              className={`settingsOption ${
                depthUnit === option.value ? "active" : ""
              }`}
              key={option.value}
              onClick={() => selectDepthUnit(option.value)}
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
