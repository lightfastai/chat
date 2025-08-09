import { redirect } from "next/navigation";

export default function HomePage() {
	// Redirect to docs by default
	redirect("/docs");
}