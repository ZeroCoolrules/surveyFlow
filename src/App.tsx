import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Navigation } from '@/components/Navigation';
import { HeroDashboard } from '@/sections/HeroDashboard';
import { OpportunityFeed } from '@/sections/OpportunityFeed';
import { TaskOrganizer } from '@/sections/TaskOrganizer';
import { FormAssistant } from '@/sections/FormAssistant';
import { SurveyCreator } from '@/sections/SurveyCreator';
import { Settings } from '@/sections/Settings';
import { Footer } from '@/sections/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIdentity } from '@/hooks/useIdentity';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

function SignInBar({ userId, signIn, loading, error }: ReturnType<typeof useIdentity>) {
  const [email, setEmail] = useState('');

  if (userId) return null;

  return (
    <div className="fixed top-16 inset-x-0 z-40 bg-brand-surface/95 backdrop-blur border-b border-white/10 py-3">
      <div className="section-container flex items-center gap-3">
        <span className="text-sm text-white/60 shrink-0">Sign in to see your real earnings and offers:</span>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-xs bg-white/5 border-white/20 text-white"
        />
        <Button size="sm" disabled={loading || !email} onClick={() => signIn(email)}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function App() {
  const identity = useIdentity();
  const { userId } = identity;

  useEffect(() => {
    // Initialize smooth scroll behavior
    ScrollTrigger.defaults({
      markers: false,
    });

    // Refresh ScrollTrigger on load
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark text-white overflow-x-hidden">
      {/* Navigation */}
      <Navigation />
      <SignInBar {...identity} />

      {/* Main Content */}
      <main>
        {/* Hero Dashboard */}
        <HeroDashboard userId={userId} />

        {/* Live Opportunity Feed */}
        <OpportunityFeed userId={userId} />

        {/* Task Organizer (Kanban) */}
        <TaskOrganizer />

        {/* Form Assistant */}
        <FormAssistant />

        {/* Survey Creator */}
        <SurveyCreator />

        {/* Network Settings */}
        <Settings />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
