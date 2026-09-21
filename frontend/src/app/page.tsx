import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function HomePage() {
  const hasSession = Boolean(cookies().get("ivoolve_session")?.value);
  redirect(hasSession ? "/dashboard" : "/login");
}
