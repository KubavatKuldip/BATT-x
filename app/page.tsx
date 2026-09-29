import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  // If user is authenticated, go to dashboard
  if (session) {
    redirect("/dashboard");
  }

  // If user is not authenticated, go to login
  redirect("/auth/signin");
}
