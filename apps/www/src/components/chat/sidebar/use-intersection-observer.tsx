import { useEffect, useRef, useState } from "react";

interface UseIntersectionObserverOptions {
	root?: Element | null;
	rootMargin?: string;
	threshold?: number | number[];
}

interface UseIntersectionObserverResult {
	ref: React.RefObject<HTMLDivElement | null>;
	isIntersecting: boolean;
}

export function useIntersectionObserver(
	options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverResult {
	const { root = null, rootMargin = "0px", threshold = 0 } = options;

	const ref = useRef<HTMLDivElement>(null);
	const [isIntersecting, setIsIntersecting] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsIntersecting(entry.isIntersecting);
			},
			{ root, rootMargin, threshold },
		);

		observer.observe(element);

		return () => {
			observer.unobserve(element);
			observer.disconnect();
		};
	}, [root, rootMargin, threshold]);

	return { ref, isIntersecting };
}
