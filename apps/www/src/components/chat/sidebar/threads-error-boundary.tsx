"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@lightfast/ui/components/ui/alert";
import { Button } from "@lightfast/ui/components/ui/button";
import { AlertCircle } from "lucide-react";
import type React from "react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: (error: Error, reset: () => void) => ReactNode;
}

export class ThreadsErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log to console in development
		if (process.env.NODE_ENV === "development") {
			console.error("ThreadsErrorBoundary caught error:", error, errorInfo);
		}

		// In production, you could log to an error reporting service
		// logErrorToService(error, errorInfo);
	}

	reset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError && this.state.error) {
			if (this.props.fallback) {
				return this.props.fallback(this.state.error, this.reset);
			}

			return (
				<div className="p-4">
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Error loading conversations</AlertTitle>
						<AlertDescription className="mt-2">
							<p className="text-sm">
								{this.state.error.message || "An unexpected error occurred"}
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={this.reset}
								className="mt-3"
							>
								Try again
							</Button>
						</AlertDescription>
					</Alert>
				</div>
			);
		}

		return this.props.children;
	}
}
