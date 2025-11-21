export interface Agent {
  initials: string;
  name: string;
  email: string;
  ghlId: string;
}

export const AGENTS: Agent[] = [
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
];

export function getAgentByInitials(initials: string): Agent | undefined {
  return AGENTS.find(agent => agent.initials === initials);
}
