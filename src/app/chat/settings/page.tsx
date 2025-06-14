import { redirect } from "next/navigation"

export default function ChatSettingsPage() {
  // Redirect to profile page by default
  redirect("/chat/settings/profile")
}
