import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h2 className="text-2xl font-bold">Page Not Found</h2>
				<p className="mt-2 text-muted-foreground">
					The documentation page you're looking for doesn't exist.
				</p>
				<Link
					href="/docs"
					className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
				>
					Return to docs home
				</Link>
			</div>
		</div>
	);
}
