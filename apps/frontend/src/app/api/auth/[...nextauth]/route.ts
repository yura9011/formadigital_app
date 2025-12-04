import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    const res = await fetch("http://localhost:3000/auth/login", {
                        method: "POST",
                        body: JSON.stringify(credentials),
                        headers: { "Content-Type": "application/json" },
                    });

                    const user = await res.json();

                    if (res.ok && user) {
                        return user.user; // Return the user object from the backend response
                    }
                    return null;
                } catch (e) {
                    console.error(e);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = user;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.user = token.user;
            return session;
        },
    },
});

export { handler as GET, handler as POST };
