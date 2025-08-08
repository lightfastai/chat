import { SignUp } from "@clerk/nextjs";

export default function Page() {
	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="text-center">
				<h1 className="text-2xl font-bold mb-4">
					Registration Temporarily Disabled
				</h1>
				<p className="text-muted-foreground mb-8">
					New user registrations are temporarily disabled during migration.
					<br />
					Please try again later or contact support if you need immediate
					access.
				</p>
				<SignUp
					appearance={{
						elements: {
							rootBox: "mx-auto",
							card: "bg-background shadow-xl opacity-50 pointer-events-none",
						},
					}}
					afterSignUpUrl="/chat"
					signInUrl="/sign-in"
				/>
			</div>
		</div>
	);
}

