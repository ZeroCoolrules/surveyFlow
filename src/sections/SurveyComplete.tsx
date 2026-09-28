import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Landing page CPX (and other networks with a similar redirect scheme) sends
 * the user's browser tab to after they finish a survey. The actual earnings
 * credit comes from the server-to-server postback (see server/webhooks or
 * functions/api), never from this page -- this is UI-only, so it can't be
 * spoofed into crediting money by messing with the URL.
 *
 * We deliberately don't try to say "you passed" / "you failed" here: CPX's
 * message_id is meant to be looked up through their own wall widget (a
 * product we don't use), and we don't have documented semantics for what
 * its values mean on this redirect-only flow. Guessing would risk telling
 * a user their survey succeeded when it didn't, so we stay neutral and let
 * the real earnings ledger be the source of truth.
 */
export function SurveyComplete() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white px-6">
      <div className="glass-card max-w-md w-full p-8 text-center">
        <HelpCircle className="w-12 h-12 mx-auto mb-4 text-white/40" />
        <h1 className="text-2xl font-heading font-bold mb-2">You're back from the survey</h1>
        <p className="text-white/60 mb-6">
          If you completed it, the reward will appear in your dashboard once the network confirms it
          &mdash; usually within a few minutes, sometimes longer. If it doesn't show up, the survey
          likely wasn't completed or you didn't qualify.
        </p>
        <Button asChild className="bg-gradient-to-r from-brand-purple to-brand-blue text-white">
          <a href="/">Back to Dashboard</a>
        </Button>
      </div>
    </div>
  );
}
