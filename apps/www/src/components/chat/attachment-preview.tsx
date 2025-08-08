"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import { useConvexAuth, useQuery } from "convex/react";
import { Download, ExternalLink, FileText, Image } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface AttachmentPreviewProps {
	attachmentIds: Id<"files">[];
}

type FileWithUrl = Doc<"files"> & { url: string | null };

export function AttachmentPreview({ attachmentIds }: AttachmentPreviewProps) {
	const { isAuthenticated } = useConvexAuth();
	const files = useQuery(api.files.getFiles, isAuthenticated ? { fileIds: attachmentIds } : "skip");

	if (!files || files.length === 0) return null;

	return (
		<div className="mt-2 flex flex-wrap gap-2">
			{files.map((file: FileWithUrl | null) => {
				if (!file) return null;

				const isImage = file.fileType.startsWith("image/");

				return (
					<div
						key={file._id}
						className="group relative rounded-lg border bg-card p-2 hover:bg-accent/50 transition-colors"
					>
						<div className="flex items-center gap-2">
							{isImage ? (
								<Image className="w-4 h-4 text-muted-foreground" />
							) : (
								<FileText className="w-4 h-4 text-muted-foreground" />
							)}

							<div className="flex-1 min-w-0">
								<p className="text-xs font-medium truncate max-w-[150px]">
									{file.fileName}
								</p>
								<p className="text-[10px] text-muted-foreground">
									{formatFileSize(file.fileSize)}
								</p>
							</div>

							<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								{file.url && (
									<>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											asChild
										>
											<a
												href={file.url}
												target="_blank"
												rel="noopener noreferrer"
												title="Open in new tab"
											>
												<ExternalLink className="w-3 h-3" />
											</a>
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											asChild
										>
											<a
												href={file.url}
												download={file.fileName}
												title="Download"
											>
												<Download className="w-3 h-3" />
											</a>
										</Button>
									</>
								)}
							</div>
						</div>

						{/* Preview for images */}
						{isImage && file.url && (
							<div className="mt-2">
								<img
									src={file.url}
									alt={file.fileName}
									className="max-w-full max-h-32 rounded object-cover"
								/>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
