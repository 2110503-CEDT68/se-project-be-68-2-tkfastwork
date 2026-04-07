import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}
