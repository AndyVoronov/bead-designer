import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OAuth2Provider = any;

// ── Custom Yandex provider (OAuth2) ──────────────────────────────────────────
const Yandex: OAuth2Provider = {
  id: "yandex",
  name: "Яндекс",
  type: "oauth",
  authorization: {
    url: "https://oauth.yandex.ru/authorize",
    params: { response_type: "code", scope: "login:info login:email login:avatar" },
  },
  token: "https://oauth.yandex.ru/token",
  userinfo: "https://login.yandex.ru/info?format=json",
  checks: ["pkce"],
  clientId: process.env.AUTH_YANDEX_ID!,
  clientSecret: process.env.AUTH_YANDEX_SECRET!,
  profile(profile: Record<string, unknown>) {
    return {
      id: String(profile.id),
      name: (profile.display_name as string) || (profile.real_name as string) || (profile.login as string),
      email: (profile.default_email as string) || (profile.emails as string[] | undefined)?.[0],
      image: !profile.is_avatar_empty && profile.default_avatar_id
        ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
        : null,
    };
  },
};

// ── Custom VK provider (OAuth2) ──────────────────────────────────────────────
const VK: OAuth2Provider = {
  id: "vkontakte",
  name: "ВКонтакте",
  type: "oauth",
  authorization: {
    url: "https://oauth.vk.com/authorize",
    params: { response_type: "code" },
  },
  token: "https://oauth.vk.com/access_token",
  userinfo: "https://api.vk.com/method/users.get",
  checks: ["pkce"],
  clientId: process.env.AUTH_VK_ID!,
  clientSecret: process.env.AUTH_VK_SECRET!,
  async profile(profileResponse: { response?: Array<{ id: number; first_name: string; last_name: string; photo_200?: string }> }) {
    // VK returns data in { response: [...] }
    const user = profileResponse.response?.[0];
    return {
      id: String(user?.id ?? ""),
      name: user ? `${user.first_name} ${user.last_name}` : "",
      email: null, // VK doesn't always provide email
      image: user?.photo_200 ?? null,
    };
  },
  // VK API requires access_token and version as query params
  async userinfoRequest({ tokens }: { tokens: { access_token?: string } }) {
    return {
      url: `https://api.vk.com/method/users.get?fields=photo_200&access_token=${tokens.access_token}&v=5.131`,
    };
  },
};

// ── Auth.js config ───────────────────────────────────────────────────────────

const providers = [Yandex];

// Only add VK provider if credentials are configured
if (process.env.AUTH_VK_ID && process.env.AUTH_VK_SECRET) {
  providers.push(VK);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  // No PrismaAdapter — we handle user/account creation manually via callbacks
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user) return false;

      const provider = account.provider;
      const providerId = account.providerAccountId;

      // Find existing account or user
      const existingAccount = await prisma.account.findUnique({
        where: { provider_providerId: { provider, providerId } },
        include: { user: true },
      });

      if (existingAccount) {
        // Update account
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            accountId: user.name,
          },
        });
        // Set the user ID from DB for JWT
        user.id = String(existingAccount.userId);
        return true;
      }

      // Check if user exists by email (to link accounts)
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (existingUser) {
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              provider,
              providerId,
              accountId: user.name,
            },
          });
          user.id = String(existingUser.id);
          return true;
        }
      }

      // Create new user + account
      const newUser = await prisma.user.create({
        data: {
          name: user.name ?? null,
          email: user.email ?? null,
          avatar: user.image ?? null,
          accounts: {
            create: {
              provider,
              providerId,
              accountId: user.name,
            },
          },
        },
      });

      // Set the user ID on the account for JWT
      user.id = String(newUser.id);
      return true;
    },

    async jwt({ token, account, user, trigger, session }) {
      // Handle session update (e.g. from useSession().update())
      if (trigger === "update" && session) {
        return token;
      }

      // Initial sign in — look up real DB userId by provider account
      if (user && account) {
        try {
          const dbAccount = await prisma.account.findUnique({
            where: {
              provider_providerId: {
                provider: account.provider,
                providerId: account.providerAccountId,
              },
            },
          });
          if (dbAccount) {
            token.userId = String(dbAccount.userId);
          } else {
            // Fallback: use user.id as-is (shouldn't normally happen)
            token.userId = String(user.id);
          }
          token.provider = account.provider;
        } catch (err) {
          console.error("[jwt] failed to look up user:", err);
          token.userId = String(user.id);
        }
      }

      // Ensure userId is always a string
      if (token.userId && typeof token.userId === "number") {
        token.userId = String(token.userId);
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId);
      }
      return session;
    },
  },
  pages: {
    // No custom sign-in page — we use our LoginModal component
    signIn: undefined,
  },
});

// ── Type augmentation ────────────────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
  }
}
