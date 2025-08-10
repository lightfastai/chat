"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import { cn } from "@lightfast/ui/lib/utils";
import { LogIn } from "lucide-react";

interface ExternalSignInButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  children?: React.ReactNode;
}

export function ExternalSignInButton({
  className,
  size = "default",
  variant = "default",
  children,
}: ExternalSignInButtonProps) {
  const handleSignIn = () => {
    // Get the current URL to pass as redirect
    const currentUrl = window.location.pathname;
    const authUrl = process.env.NODE_ENV === "production" 
      ? "https://auth.lightfast.ai"
      : "http://localhost:4104";
    
    // Redirect to auth app with return URL
    window.location.href = `${authUrl}/sign-in?redirect_url=${encodeURIComponent(window.location.origin + currentUrl)}`;
  };

  return (
    <Button
      onClick={handleSignIn}
      className={cn(className)}
      size={size}
      variant={variant}
    >
      {children || (
        <>
          <LogIn className="w-4 h-4 mr-2" />
          Sign in
        </>
      )}
    </Button>
  );
}