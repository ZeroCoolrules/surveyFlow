import { useRef, useState, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  DollarSign,
  Clock,
  TrendingUp,
  ExternalLink,
  Star,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getLiveOpportunities, getRankedOpportunities, type LiveOffer, type RankedOffer } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function hourlyRate(offer: LiveOffer) {
  if (!offer.estimatedMinutes || offer.estimatedMinutes <= 0) return null;
  return (offer.rewardCents / 100 / offer.estimatedMinutes) * 60;
}

const networkColors: Record<string, string> = {
  cpx: 'from-orange-500 to-yellow-500',
  bitlabs: 'from-brand-purple to-pink-500',
  adgate: 'from-brand-teal to-green-500',
};

function OpportunityCard({ offer }: { offer: LiveOffer | RankedOffer }) {
  const [isHovered, setIsHovered] = useState(false);
  const rate = hourlyRate(offer);
  const ranked = 'matchScore' in offer ? (offer as RankedOffer) : null;

  return (
    <Card
      className="glass-card p-5 min-w-[320px] max-w-[320px] transition-all duration-500 cursor-pointer group"
      style={{
        transform: isHovered ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
        boxShadow: isHovered ? '0 20px 60px rgba(127, 86, 217, 0.2)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${networkColors[offer.network] ?? 'from-brand-purple to-brand-blue'} flex items-center justify-center`}
        >
          <Star className="w-5 h-5 text-white" />
        </div>
        {ranked && (
          <Badge variant="outline" className="bg-brand-purple/20 text-brand-purple border-brand-purple/30 text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {ranked.matchScore}% match
          </Badge>
        )}
      </div>

      <h3 className="text-lg font-heading font-semibold text-white mb-2 group-hover:text-brand-purple transition-colors line-clamp-1">
        {offer.title}
      </h3>
      <p className="text-sm text-white/60 mb-4 line-clamp-2">
        {ranked?.reason || offer.description || 'Real survey opportunity from a live partner network.'}
      </p>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-brand-teal" />
          <span className="text-lg font-bold text-white">{centsToDollars(offer.rewardCents)}</span>
        </div>
        {offer.estimatedMinutes && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-blue" />
            <span className="text-sm text-white/60">{offer.estimatedMinutes} min</span>
          </div>
        )}
        {rate && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-brand-purple" />
            <span className="text-sm text-white/60">${rate.toFixed(2)}/hr</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <span className="text-xs text-white/40 uppercase">{offer.network}</span>
        <Button
          size="sm"
          asChild
          className="bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 text-white"
        >
          <a href={offer.clickUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-1" />
            Take Survey
          </a>
        </Button>
      </div>
    </Card>
  );
}

export function OpportunityFeed({ userId }: { userId: string | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [offers, setOffers] = useState<LiveOffer[]>([]);
  const [ranked, setRanked] = useState<RankedOffer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [networksConfigured, setNetworksConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLiveOpportunities(userId);
      setOffers(res.offers);
      setNetworksConfigured(res.networksConfigured);
      setRanked(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live offers');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const rankWithAi = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getRankedOpportunities(userId, []);
      setRanked(res.ranked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rank offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(
          section.querySelectorAll('.animate-item'),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
        );
      },
      once: true,
    });
    return () => trigger.kill();
  }, [offers]);

  const list = ranked ?? offers;
  const totalPotentialCents = list.reduce((sum, o) => sum + o.rewardCents, 0);

  return (
    <section id="opportunities" ref={sectionRef} className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-dark via-brand-surface/50 to-brand-dark" />

      <div className="relative z-10 section-container">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="animate-item">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-white mb-3">
              Live <span className="gradient-text">Opportunities</span>
            </h2>
            <p className="text-white/60 max-w-xl">
              Real, currently-available surveys pulled directly from partner networks. Taking one opens
              the network's real survey in a new tab &mdash; your reward is credited only after that
              network confirms your completion.
            </p>
          </div>

          <div className="flex gap-3 animate-item">
            <Button variant="outline" onClick={load} disabled={loading} className="border-white/20 text-white hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={rankWithAi} disabled={loading || offers.length === 0} className="bg-gradient-to-r from-brand-purple to-brand-blue text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Rank
            </Button>
          </div>
        </div>

        {!networksConfigured && !loading && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3 animate-item">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              No survey network API keys are configured on the server yet, so there are no offers to show.
              Set <code className="text-yellow-100">CPX_APP_ID</code> / <code className="text-yellow-100">BITLABS_API_TOKEN</code>{' '}
              in <code className="text-yellow-100">server/.env</code> once you've signed up with a network.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300 animate-item">
            {error}
          </div>
        )}

        <div className="relative animate-item">
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
            {list.map((offer) => (
              <div key={`${offer.network}:${offer.externalOfferId}`} className="snap-start">
                <OpportunityCard offer={offer} />
              </div>
            ))}
            {list.length === 0 && !loading && networksConfigured && (
              <p className="text-white/40 text-sm py-8">No offers available for your account right now &mdash; check back soon.</p>
            )}
          </div>
        </div>

        <div className="mt-12 glass-card p-6 animate-item">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-heading font-bold text-brand-purple">{list.length}</p>
              <p className="text-sm text-white/60 mt-1">Available Now</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-heading font-bold text-brand-teal">${centsToDollars(totalPotentialCents)}</p>
              <p className="text-sm text-white/60 mt-1">Potential Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-heading font-bold text-brand-blue">
                {Math.round(list.reduce((sum, o) => sum + (o.estimatedMinutes ?? 0), 0) / 60 * 10) / 10}h
              </p>
              <p className="text-sm text-white/60 mt-1">Total Time</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
