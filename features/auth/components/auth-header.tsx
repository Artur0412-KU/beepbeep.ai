"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, UserRound } from "lucide-react";
import { AuthDialog, type AuthMode } from "@/features/auth/components/auth-dialog";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";

type AuthHeaderProps = {
  onOpenConversations?: () => void;
};

export function AuthHeader({ onOpenConversations }: AuthHeaderProps) {
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const openAuth = (nextMode: AuthMode) => {
    setMode(nextMode);
    setOpen(true);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    setIsLoggingOut(false);
  };

  return (
    <>
      <header className="mb-4 flex items-center justify-between px-1 sm:mb-5">
        <div className="font-display text-lg font-bold tracking-[-0.04em] text-ink">
          beepbeep<span className="text-[#66891a]">.ai</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenConversations && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open conversations"
              title="Conversations"
              onClick={onOpenConversations}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          {user ? (
            <>
              <Link
                href="/user"
                aria-label="Open profile"
                title="Profile"
                className={buttonVariants({ variant: "ghost", size: "icon" })}
              >
                <UserRound className="h-4 w-4" />
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuth("sign-in")}
              >
                Sign In
              </Button>
              <Button size="sm" onClick={() => openAuth("sign-up")}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </header>

      <AuthDialog
        open={open}
        initialMode={mode}
        onOpenChange={setOpen}
      />
    </>
  );
}
