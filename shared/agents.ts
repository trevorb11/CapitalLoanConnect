export interface Agent {
  initials: string;
  name: string;
  email: string;
  ghlId: string;
}

export const AGENTS: Agent[] = [
  {
    initials: "aw",
    name: "Alex Walker",
    email: "alex@todaycapitalgroup.com",
    ghlId: "",
  },
  {
    initials: "dl",
    name: "Dillon LeBlanc",
    email: "Dillon@todaycapitalgroup.com",
    ghlId: "bP6gsnfy2JEghMxmVxxM",
  },
  {
    initials: "gd",
    name: "Greg Dergevorkian",
    email: "greg@todaycapitalgroup.com",
    ghlId: "T8QHapiHFdy5Hb6m07Ge",
  },
  {
    initials: "jr",
    name: "Jonathan Rendon",
    email: "jonathan@todaycapitalgroup.com",
    ghlId: "cB5EThq7vE8AtfFMzcBs",
  },
  {
    initials: "js",
    name: "Julius Speck",
    email: "julius@todaycapitalgroup.com",
    ghlId: "dWgVWYaYh2qIBNhoWtpX",
  },
  {
    initials: "kn",
    name: "Kenny Nwobi",
    email: "Kenny@todaycapitalgroup.com",
    ghlId: "u7wg8GcSQNWAjwkJ49mW",
  },
  {
    initials: "rw",
    name: "Ryan Wilcox",
    email: "ryan@todaycapitalgroup.com",
    ghlId: "wlaFqqBVxwucMUnogZG9",
  },
  {
    initials: "sr",
    name: "Sage Robinson",
    email: "sage@todaycapitalgroup.com",
    ghlId: "GxuuCIet62gbUyac6acX",
  },
  {
    initials: "bj",
    name: "Bryce Jennings",
    email: "Bryce@todaycapitalgroup.com",
    ghlId: "NoRxwknVbhhjCg1g7kw",
  },
  {
    initials: "jb",
    name: "Jonathan Bishop",
    email: "jb@todaycapitalgroup.com",
    ghlId: "GxuuCIet62gbUyacBacX",
  },
  {
    initials: "mf",
    name: "Manny Fanalua",
    email: "manny@todaycapitalgroup.com",
    ghlId: "p5Omnaxoz30PPsp5cofl",
  },
  {
    initials: "ja",
    name: "James Atkinson",
    email: "James@todaycapitalgroup.com",
    ghlId: "dRUIBKKS1MOXWFbA9F6",
  },
  {
    initials: "dk",
    name: "Dominic Kendl",
    email: "Dominic@todaycapitalgroup.com",
    ghlId: "E7Ab3ZniQBxeC2BgwbdK",
  },
  {
    initials: "do",
    name: "Diego Orellana",
    email: "diego@todaycapitalgroup.com",
    ghlId: "rY714b49S3YL5IKPLOU3",
  },
  {
    initials: "dc",
    name: "Dennys Cisne",
    email: "Dennys@todaycapitalgroup.com",
    ghlId: "LOS6jIBhXamV7JhVfPH",
  },
];

export function getAgentByInitials(initials: string): Agent | undefined {
  return AGENTS.find(agent => agent.initials === initials);
}

// Agents with restricted "user" role - can only see their own submissions
// These users can submit applications and bank statements but cannot access
// full agent dashboard or view other agents' data
export const RESTRICTED_AGENTS: string[] = [
  "bryce@todaycapitalgroup.com",
];

export function isRestrictedAgent(email: string): boolean {
  return RESTRICTED_AGENTS.some(e => e.toLowerCase() === email.toLowerCase());
}
