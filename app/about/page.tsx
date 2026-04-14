import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Maharashtra PFZ",
  description:
    "About the Maharashtra Potential Fishing Zone spot data, refresh timing, and safe use."
};

const notes = [
  {
    title: "What PFZ Means",
    text: "Potential Fishing Zones identify ocean areas where fish aggregation is more likely."
  },
  {
    title: "How It Is Derived",
    text: "PFZ advisories use satellite observations such as sea surface temperature and chlorophyll."
  },
  {
    title: "Coastal Reference",
    text: "Each entry starts from a named coast and points toward the suggested offshore zone."
  },
  {
    title: "Direction",
    text: "Direction and bearing describe where the fishing zone lies from the listed coastal place."
  },
  {
    title: "Distance And Depth",
    text: "Distance from coast and water depth are advisory ranges for the suggested zone."
  },
  {
    title: "Safe Use",
    text: "PFZ guidance should be used with weather, sea-state, navigation, and official warning information."
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
            INCOIS PFZ advisories highlight offshore areas where fishing
            potential may be higher, using coastal references, direction,
            distance, depth, and coordinates.
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
