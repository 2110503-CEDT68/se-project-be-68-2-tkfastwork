import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    token: string;
    role: "user" | "admin";
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      token: string;
      role: "user" | "admin";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    token: string;
    role: "user" | "admin";
  }
}
