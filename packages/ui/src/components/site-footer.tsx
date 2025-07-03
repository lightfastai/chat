import { Dot } from "lucide-react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { Icons } from "./ui/icons";

export interface SiteFooterProps {
	className?: string;
	siteName: string;
	homeUrl: string;
	links?: {
		github?: string;
		discord?: string;
		twitter?: string;
		privacy?: string;
		terms?: string;
		docs?: string;
	};
}

export function SiteFooter({
	className,
	siteName,
	homeUrl,
	links,
}: SiteFooterProps) {
	const currentYear = new Date().getFullYear();
	const companyName = siteName.split(" ")[0];

	return (
		<footer className={cn("w-full py-8", className)}>
			<div className="text-muted-foreground relative flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
				<div className="flex items-center gap-4">
					{links?.github && (
						<Link
							target="_blank"
							href={links.github}
							aria-label="GitHub"
							className="transition-transform duration-200 hover:scale-110"
						>
							<Icons.gitHub className="size-4" />
						</Link>
					)}
					{links?.discord && (
						<Link
							target="_blank"
							href={links.discord}
							aria-label="Discord"
							className="transition-transform duration-200 hover:scale-110"
						>
							<Icons.discord className="size-4" />
						</Link>
					)}
					{links?.twitter && (
						<Link
							target="_blank"
							href={links.twitter}
							aria-label="Twitter"
							className="transition-transform duration-200 hover:scale-110"
						>
							<Icons.twitter className="size-3" />
						</Link>
					)}
				</div>

				<div className="flex flex-col items-center gap-2 md:absolute md:left-1/2 md:-translate-x-1/2">
					<nav className="flex items-center gap-2 md:gap-4">
						<Link
							href={homeUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-foreground text-xs transition-all duration-200 hover:underline hover:underline-offset-4"
						>
							Home
						</Link>
						{links?.docs && (
							<>
								<Dot className="size-2" />
								<Link
									href={links.docs}
									className="hover:text-foreground text-xs transition-all duration-200 hover:underline hover:underline-offset-4"
								>
									Docs
								</Link>
							</>
						)}
						{links?.privacy && (
							<>
								<Dot className="size-2" />
								<Link
									href={links.privacy}
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-foreground text-xs transition-all duration-200 hover:underline hover:underline-offset-4"
								>
									Privacy
								</Link>
							</>
						)}
						{links?.terms && (
							<>
								<Dot className="size-2" />
								<Link
									href={links.terms}
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-foreground text-xs transition-all duration-200 hover:underline hover:underline-offset-4"
								>
									Terms
								</Link>
							</>
						)}
					</nav>
				</div>

				<div className="flex items-center gap-4">
					<span className="group relative cursor-default text-xs">
						<span className="group-hover:text-foreground relative inline-block transition-all duration-300 group-hover:-translate-y-1">
							{companyName}
						</span>
						<span className="group-hover:text-primary relative mx-1 inline-block transition-all duration-300 group-hover:opacity-0">
							Inc.
						</span>
						<span className="group-hover:text-muted relative inline-block transition-all duration-300 group-hover:opacity-0">
							©
						</span>
						<span className="group-hover:text-foreground relative ml-1 inline-block transition-all duration-300 group-hover:-translate-y-1">
							{currentYear}
						</span>
						<span className="from-primary/40 via-primary to-primary/40 absolute bottom-0 left-0 h-[1px] w-0 bg-gradient-to-r transition-all duration-500 group-hover:w-full" />
					</span>
				</div>
			</div>
		</footer>
	);
}
