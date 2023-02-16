export const PORT: number = Number(process.env.PORT) || 4000;
export const HOST: string = process.env.HOST || "localhost";
export const MONGOPASS: string = process.env.DATABASE_URL || "NOT-FOUND";
// export const PROJECTID: string = process.env.ID || "NOT-FOUND";
// export const TOKEN: string = process.env.TOKEN || "NOT-FOUND";

export const GITID: string = process.env.GITHUB_ID || "NOTFOUND";
export const GITSECRET: string = process.env.GITHUB_SECRET || "NOTFOUND";

export const DSID: string = process.env.DISCORD_ID || "NOTFOUND";
export const DSSECRET: string = process.env.DISCORD_SECRET || "NOTFOUND";

export const GID: string = process.env.GOOGLE_ID || "NOTFOUND";
export const GSECRET: string = process.env.GOOGLE_SECRET || "NOTFOUND";

export const PASS: string = process.env.PASS || "NOTFOUND";
export const EMAIL: string = process.env.EMAIL || "NOTFOUND";