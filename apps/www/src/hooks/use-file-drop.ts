import { useCallback, useRef, useState } from "react";

interface UseFileDropOptions {
	onDrop: (files: FileList) => void | Promise<void>;
	acceptedFileTypes?: string[];
	disabled?: boolean;
}

interface UseFileDropReturn {
	isDragging: boolean;
	dragHandlers: {
		onDragEnter: (e: React.DragEvent) => void;
		onDragLeave: (e: React.DragEvent) => void;
		onDragOver: (e: React.DragEvent) => void;
		onDrop: (e: React.DragEvent) => void;
	};
}

export function useFileDrop({
	onDrop,
	acceptedFileTypes,
	disabled = false,
}: UseFileDropOptions): UseFileDropReturn {
	const [isDragging, setIsDragging] = useState(false);
	const dragCounter = useRef(0);

	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (disabled) return;

			dragCounter.current++;

			if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
				setIsDragging(true);
			}
		},
		[disabled],
	);

	const handleDragLeave = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (disabled) return;

			dragCounter.current--;

			if (dragCounter.current === 0) {
				setIsDragging(false);
			}
		},
		[disabled],
	);

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (disabled) return;

			// Set the drop effect to copy
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = "copy";
			}
		},
		[disabled],
	);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			setIsDragging(false);
			dragCounter.current = 0;

			if (disabled) return;

			const files = e.dataTransfer.files;

			if (files && files.length > 0) {
				// Optional file type validation
				if (acceptedFileTypes && acceptedFileTypes.length > 0) {
					const validFiles = Array.from(files).filter((file) =>
						acceptedFileTypes.includes(file.type),
					);

					if (validFiles.length > 0) {
						const filteredFileList = new DataTransfer();
						for (const file of validFiles) {
							filteredFileList.items.add(file);
						}
						await onDrop(filteredFileList.files);
					}
				} else {
					await onDrop(files);
				}
			}
		},
		[onDrop, acceptedFileTypes, disabled],
	);

	return {
		isDragging,
		dragHandlers: {
			onDragEnter: handleDragEnter,
			onDragLeave: handleDragLeave,
			onDragOver: handleDragOver,
			onDrop: handleDrop,
		},
	};
}
