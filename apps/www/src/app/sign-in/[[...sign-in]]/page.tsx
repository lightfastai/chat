import { SignIn } from "@clerk/nextjs";

export default function Page() {
	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<SignIn
				appearance={{
					elements: {
						rootBox: "mx-auto",
						card: "bg-background shadow-xl",
					},
				}}
				afterSignInUrl="/chat"
				signUpUrl="/sign-up"
			/>
		</div>
	);
}
