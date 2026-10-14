import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { OrchestrationDemo } from './components/OrchestrationDemo';
import { Features } from './components/Features';
import { EcosystemMap } from './components/EcosystemMap';
import { BeforeAfter } from './components/BeforeAfter';
import { Pricing } from './components/Pricing';
import { DownloadSection } from './components/DownloadSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { EarlyAccessModal } from './components/EarlyAccessModal';

export const App: React.FC = () => {
  const [isEarlyAccessOpen, setIsEarlyAccessOpen] = useState(false);

  const handleOpenEarlyAccess = () => {
    setIsEarlyAccessOpen(true);
  };

  const handleCloseEarlyAccess = () => {
    setIsEarlyAccessOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-slate-100 flex flex-col font-sans selection:bg-brand-blue/30 selection:text-white">
      {/* Sticky Glass Navbar */}
      <Navbar onOpenEarlyAccess={handleOpenEarlyAccess} />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* Hero Section with Embedded Windows Desktop App Preview */}
        <Hero onOpenEarlyAccess={handleOpenEarlyAccess} />

        {/* Central Interactive Orchestration Simulator */}
        <OrchestrationDemo />

        {/* 6 Core Feature Showcases */}
        <Features />

        {/* Ecosystem Compatibility Map */}
        <EcosystemMap />

        {/* Before vs After Developer Reality Comparison */}
        <BeforeAfter />

        {/* Transparent Commercial Pricing Tiers */}
        <Pricing onOpenEarlyAccess={handleOpenEarlyAccess} />

        {/* Dedicated Windows Desktop Download Area */}
        <DownloadSection onOpenEarlyAccess={handleOpenEarlyAccess} />

        {/* Honest & Deep FAQ Accordion */}
        <FaqSection />
      </main>

      {/* Footer with Independent Developer Tool Disclaimers */}
      <Footer />

      {/* Early Access / Waitlist Modal */}
      <EarlyAccessModal 
        isOpen={isEarlyAccessOpen} 
        onClose={handleCloseEarlyAccess} 
      />
    </div>
  );
};

export default App;
