import { siteConfig } from "@/src/lib/site-config";
import { Icons } from "@repo/ui/components/ui/icons";
import Link from "next/link";

export function SiteHeader() {
	return (
		<div className="w-full flex justify-between items-center py-3 px-6 border-b">
			<div className="flex-1">
				{/* Left side - could add logo or title here */}
			</div>
			<div className="flex items-center gap-6">
				<Link
					href={siteConfig.links.github.href}
					target={siteConfig.links.github.external ? "_blank" : undefined}
					rel={
						siteConfig.links.github.external ? "noopener noreferrer" : undefined
					}
					aria-label={siteConfig.links.github.title}
					className="transition-transform duration-200 hover:scale-110"
				>
					<Icons.gitHub className="size-4" />
				</Link>
				<Link
					href={siteConfig.links.twitter.href}
					target={siteConfig.links.twitter.external ? "_blank" : undefined}
					rel={
						siteConfig.links.twitter.external
							? "noopener noreferrer"
							: undefined
					}
					aria-label={siteConfig.links.twitter.title}
					className="transition-transform duration-200 hover:scale-110"
				>
					<Icons.twitter className="size-3" />
				</Link>
				<Link
					href={siteConfig.links.discord.href}
					target={siteConfig.links.discord.external ? "_blank" : undefined}
					rel={
						siteConfig.links.discord.external
							? "noopener noreferrer"
							: undefined
					}
					aria-label={siteConfig.links.discord.title}
					className="transition-transform duration-200 hover:scale-110"
				>
					<Icons.discord className="size-4" />
				</Link>
			</div>
		</div>
	);
}
