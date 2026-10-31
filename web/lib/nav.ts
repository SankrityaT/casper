/* Every link on the site lives here, so the header and footer can't drift apart. */
export const GITHUB = "https://github.com/SankrityaT/casper";

export const TOP_NAV: [string, string][] = [
  ["How it works", "/#how"],
  ["Agents", "/#agents"],
  ["Crew", "/crew"],
  ["Docs", "/docs"],
];

export const FOOTER_COLS: [string, [string, string][]][] = [
  ["Product", [["How it works", "/#how"], ["Agents", "/#agents"], ["Open a room", "/onboarding"], ["The app", "/app"]]],
  ["Build", [["Docs", "/docs"], ["MCP server", "/docs#mcp"], ["GitHub", GITHUB], ["Changelog", "/changelog"]]],
  ["The manor", [["The house crew", "/crew"], ["Lazarus", "/lazarus"], ["Privacy", "/privacy"], ["Contact", "/contact"]]],
];

export const isExternal = (href: string) => /^https?:/.test(href);
