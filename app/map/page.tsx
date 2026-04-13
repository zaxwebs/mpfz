"use client";

import dynamic from "next/dynamic";

const PfzMap = dynamic(() => import("../../components/PfzMap"), {
  ssr: false,
  loading: () => (
    <main className="shell mapShellLoading">
      <section className="mapLoading" aria-live="polite">
        <div className="mapLoadingPanel">
          <span className="loadingDot" />
          <strong>Loading map</strong>
          <span>Getting Maharashtra PFZ spots ready</span>
        </div>
      </section>
    </main>
  )
});

export default function MapPage() {
  return <PfzMap />;
}
