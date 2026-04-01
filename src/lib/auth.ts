import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";

// ── Custom Yandex provider (OAuth2) ──────────────────────────────────────────
const Yandex = {
  id: "yandex",
  name: "Яндекс",
  type: "oauth" as const,
  authorization: {
    url: "https://oauth.yandex.ru/authorize",
    params: { response_type: "code" },
  },
  token: "https://oauth.yandex.ru/token",
  userinfo: "https://login.yandex.ru/info",
  clientId: process.env.AUTH_YANDEX_ID!,
  clientSecret: process.env.AUTH_YANDEX_SECRET!,
  profile(profile: Record<string, unknown>) {
    return {
      id: String(profile.id),
      name: (profile.real_name as string) || (profile.display_name as string) || (profile.login as string),
      email: (profile.default_email as string) || (profile.emails as string[] | undefined)?.[0],
      image: profile.avatar_id
        ? `https://avatars.yandex.net/get-yapic/${profile.avatar_id}/islands-middle`
        : null,
    };
  },
};

// ── Custom VK provider (OAuth2) ──────────────────────────────────────────────
const VK = {
  id: "vkontakte",
  name: "ВКонтакте",
  type: "oauth" as const,
  authorization: {
    url: "https://oauth.vk.com/authorize",
    params: { response_type: "code" },
  },
  token: "https://oauth.vk.com/access_token",
  userinfo: "https://api.vk.com/method/users.get",
  clientId: process.env.AUTH_VK_ID!,
  clientSecret: process.env.AUTH_VK_SECRET!,
  async profile(profileResponse: { response?: Array<{ id: number; first_name: string; last_name: string; photo_200?: string }> }, tokens: { access_token: string }) {
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
  async userinfoRequest({ tokens, client }: { tokens: { access_token: string }; client: { id: string; secret: string } }) {
    return {
      url: `https://api.vk.com/method/users.get?fields=photo_200&access_token=${tokens.access_token}&v=5.131`,
    };
  },
};

// ── Auth.js config ───────────────────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Yandex, VK],
  // No PrismaAdapter — we handle user/account creation manually via callbacks
  // because SQLite doesn't support the full session model that @auth/prisma-adapter needs
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
        // Update account token if changed
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: account.access_token,
            accountId: user.name,
          },
        });
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
              accessToken: account.access_token,
              accountId: user.name,
            },
          });
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
              accessToken: account.access_token,
              accountId: user.name,
            },
          },
        },
      });

      // Set the user ID on the account for JWT
      user.id = String(newUser.id);
      return true;
    },

    async jwt({ token, account, user }) {
      // Initial sign in — attach user id to token
      if (user) {
        token.userId = user.id;
        token.provider = account?.provider;
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

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string | number;
    provider?: string;
  }
}
