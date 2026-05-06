import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's database ID. */
      id: string;
    } & DefaultSession["user"];
  }
}
