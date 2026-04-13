import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Maharashtra PFZ",
  description:
    "About the Maharashtra Potential Fishing Zone spot data, refresh timing, and safe use."
};

const notes = [
  {
    title: "Source",
    text: "Locations come from the INCOIS Potential Fishing Zone text advisory for Maharashtra."
  },
  {
    title: "Refresh",
    text: "The server keeps a local copy and checks for a new advisory once each day after 5:15 PM IST."
  },
  {
    title: "Fallback",
    text: "If INCOIS is temporarily unavailable, the last successful advisory stays available."
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
            A calmer way to read the daily INCOIS advisory: coastal place,
            direction, distance, depth, and coordinates in one quick list and
            map.
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
        <figure className="aboutImage">
          <img
            alt="Fishing boats near the shoreline"
            loading="lazy"
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80"
          />
        </figure>
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
