import { Avatar, AvatarFallback } from "@lightfast/ui/components/ui/avatar";
import { Input } from "@lightfast/ui/components/ui/input";
import { User } from "lucide-react";
import { SettingsHeader } from "./settings-header";
import { SettingsRow } from "./settings-row";

// Define the shape of our simplified user object
type SimplifiedUser = {
	clerkUserId: string;
	email: string | undefined;
};

export function ProfileSection({ user }: { user: SimplifiedUser }) {
	return (
		<div>
			<SettingsHeader title="User Settings" />

			<div className="mt-6 divide-y divide-border">
				<SettingsRow
					title="Profile Picture"
					description="This is your profile picture."
				>
					<Avatar className="h-10 w-10">
						<AvatarFallback>
							<User className="h-5 w-5" />
						</AvatarFallback>
					</Avatar>
				</SettingsRow>

				<SettingsRow title="Email" description="Your email address.">
					<Input
						value={user.email || ""}
						placeholder="god@lightfast.ai"
						className="w-full sm:w-64"
						disabled
					/>
				</SettingsRow>

				<SettingsRow title="User ID" description="Your unique user identifier.">
					<div className="text-sm text-muted-foreground font-mono">
						{user.clerkUserId}
					</div>
				</SettingsRow>
			</div>
		</div>
	);
}
