export const ORBIT_SUGGESTION_POOL = [
  "How do I install the tracker?",
  "Why is my site showing no data?",
  "What can a viewer do?",
  "How do I add a teammate?",
  "How do I remove a teammate?",
  "What's the difference between viewer and admin roles?",
  "How do I change my plan?",
  "How do I cancel my subscription?",
  "Where do I find my invoices?",
  "How do I add a payment method?",
  "How do I add a second site?",
  "How do I delete a site?",
  "How do I rename a site?",
  "How do I switch workspaces?",
  "How do I invite someone to my workspace?",
  "How do I change the workspace name?",
  "What is a workspace?",
  "How does Orbit calculate bounce rate?",
  "How is a unique visitor counted?",
  "What counts as a pageview?",
  "How fresh is the data I'm looking at?",
  "Does the tracker slow down my site?",
  "Is the tracker GDPR compliant?",
  "Does Orbit use cookies?",
  "How do I exclude my own visits from analytics?",
  "How do I set up a custom event?",
  "How do I track button clicks?",
  "How do I see where my traffic comes from?",
  "How do I see which pages are most popular?",
  "How do I compare this week to last week?",
  "How do I export my analytics data?",
  "How do I set up an email report?",
  "How often are email reports sent?",
  "How do I turn off notifications?",
  "How do I build a form?",
  "How do I embed a form on my site?",
  "How do I see form submissions?",
  "How do I add a new field to a form?",
  "Can I customize the form's colors?",
  "How do I connect a webhook?",
  "How do I set up spam protection on forms?",
  "How do I track SEO rankings?",
  "How do I run an SEO report?",
  "How do I check my site's Core Web Vitals?",
  "How do I add competitors to track?",
  "How do we beat a competitor's traffic?",
  "How do I change my account password?",
  "How do I update my email address?",
  "How do I enable two-factor authentication?",
  "What browsers does the tracker support?",
  "How do I get support if something breaks?",
];

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickOrbitSuggestions(count = 3): string[] {
  return shuffled(ORBIT_SUGGESTION_POOL).slice(0, count);
}

const DASHBOARD_HOSTNAMES = new Set(["studio-quantalog.daorbit.in", "localhost"]);

export function pickOrbitSuggestionsForHostname(hostname: string | null, count = 3): string[] {
  if (!hostname || DASHBOARD_HOSTNAMES.has(hostname)) {
    return pickOrbitSuggestions(count);
  }

  const pageSuggestion = `What does Orbit know about ${hostname}?`;
  const rest = shuffled(ORBIT_SUGGESTION_POOL).slice(0, Math.max(0, count - 1));
  return [pageSuggestion, ...rest];
}
