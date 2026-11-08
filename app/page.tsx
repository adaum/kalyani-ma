import React from "react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0c120c] text-[#f4f6f0] flex flex-col items-center justify-between p-6 sm:p-12 font-sans selection:bg-[#2d4a2d] selection:text-white">
      {/* Top Header / Identity */}
      <header className="w-full max-w-4xl flex items-center justify-between border-b border-[#223322] pb-6">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#8ea88e] font-semibold">
            Institutional Botanical Archive
          </span>
          <h1 className="text-xl sm:text-2xl font-serif tracking-tight text-white mt-1">
            Kalyani Ma
          </h1>
        </div>
        <span className="text-xs font-mono text-[#5b755b] border border-[#223322] px-2.5 py-1 rounded">
          Status: Active
        </span>
      </header>

      {/* Hero / Staging Content */}
      <section className="w-full max-w-2xl my-auto py-16 text-center">
        <div className="inline-block px-3 py-1 mb-6 rounded-full border border-[#2a3f2a] bg-[#142014] text-xs font-mono tracking-wide text-[#9db79d]">
          Field Research & Clinical Formulary
        </div>
        <h2 className="text-3xl sm:text-5xl font-serif font-normal tracking-tight text-white mb-6 leading-tight">
          Pure Botanical Therapeutics & Household Protocols
        </h2>
        <p className="text-[#a1b3a1] text-base sm:text-lg font-light leading-relaxed mb-8">
          Establishing uncompromising standards for therapeutic purity, chemical integrity, 
          and verified plant formulations. The primary research blueprint and interactive archive 
          are undergoing final verification.
        </p>

        {/* Temporary Dispatch / Status Notice */}
        <div className="p-4 rounded border border-[#1f301f] bg-[#111a11] text-xs text-[#7e997e] font-mono leading-relaxed max-w-md mx-auto">
          Notice: Digital blueprint integration and verified dispatch systems are currently being connected to the production edge.
        </div>
      </section>

      {/* Footer / Compliance Baseline */}
      <footer className="w-full max-w-4xl border-t border-[#1a261a] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#526652] gap-4">
        <div>
          &copy; 2026 Kalyani Ma. All rights reserved.
        </div>
        <div className="text-center sm:text-right text-[11px] max-w-md text-[#445544]">
          This archive is strictly for educational, informational, and historical botanical reference. No therapeutic or curative claims are stated or implied.
        </div>
      </footer>
    </main>
  );
}