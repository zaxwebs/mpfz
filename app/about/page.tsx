import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Maharashtra PFZ",
  description:
    "About the Maharashtra Potential Fishing Zone spot data, refresh timing, and safe use."
};

const notes = [
  {
    title: "Source",
    text: "PFZ locations come from the INCOIS Potential Fishing Zone text advisory for Maharashtra."
  },
  {
    title: "Refresh",
    text: "New data is checked once each day after 5:15 PM IST, after the usual advisory window."
  },
  {
    title: "Cache",
    text: "The last successful advisory is kept locally, so spots stay available if INCOIS is slow or unavailable."
  },
  {
    title: "Coordinates",
    text: "Coordinates can be shown as DMS or DDM from Settings, depending on how you prefer to read them."
  },
  {
    title: "Stars",
    text: "Starred spots are saved on this device and are used by the list, map, and map filter."
  },
  {
    title: "Planning",
    text: "Use PFZ locations alongside local weather, sea state, and official warnings before heading out."
  }
];

export default function AboutPage() {
  return (
    <main className="aboutPage">
      <section className="aboutIntro">
        <div className="aboutCopy">
          <p className="sectionEyebrow">About</p>
          <h1>Potential Fishing Zone spots for Maharashtra.</h1>
          <p>
            Daily INCOIS PFZ guidance, organized around the coastal place,
            direction, distance, depth, and coordinates that matter when
            planning a fishing trip.
          </p>
          <a
            className="aboutSourceLink"
            href="https://incois.gov.in/"
            rel="noreferrer"
            target="_blank"
          >
            Data source: INCOIS
          </a>
        </div>
      </section>

      <section className="aboutNotes" aria-label="Data notes">
        {notes.map((note) => (
          <article className="aboutNote" key={note.title}>
            <strong>{note.title}</strong>
            <p>{note.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
