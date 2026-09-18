import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { dbConnect } from "./lib/mongodb";
import User from "./models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] authorize() called with email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing email or password");
          return null;
        }

        await dbConnect();
        console.log("[AUTH] DB connected");

        const user = await User.findOne({ email: credentials.email.toLowerCase() }).select("+passwordHash");
        console.log("[AUTH] User found:", user ? user.email : "NONE");

        if (!user) {
          console.log("[AUTH] User not found in DB");
          return null;
        }

        console.log("[AUTH] User status:", user.status);
        if (user.status !== "active") {
          console.log("[AUTH] User not active");
          return null;
        }

        if (!user.passwordHash) {
          console.log("[AUTH] User has no passwordHash on document");
          return null;
        }

        console.log("[AUTH] Comparing password...");
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        console.log("[AUTH] Password match:", ok);

        if (!ok) {
          user.failedLoginCount = (user.failedLoginCount || 0) + 1;
          await user.save();
          return null;
        }

        console.log("[AUTH] Login SUCCESS for:", user.email);
        user.lastLoginAt = new Date();
        user.last_login = user.lastLoginAt;
        user.failedLoginCount = 0;
        await user.save();

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
