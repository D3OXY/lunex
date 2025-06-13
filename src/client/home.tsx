"use client";

import { ChatLayout } from "@/components/chat/chat-layout";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { MessageSquareIcon } from "lucide-react";

export default function Home(): React.JSX.Element {
    return (
        <>
            <Authenticated>
                <div className="h-full w-full">
                    <ChatLayout />
                </div>
            </Authenticated>

            <Unauthenticated>
                <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br">
                    <div className="bg-card mx-auto max-w-md space-y-6 rounded-lg border p-8 shadow-lg">
                        <div className="text-center">
                            <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                                <MessageSquareIcon className="text-primary h-8 w-8" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">Welcome to Lunex Chat</h1>
                            <p className="text-muted-foreground mt-2">Sign in to start chatting with AI-powered assistance</p>
                        </div>

                        <div className="space-y-3">
                            <SignInButton mode="modal">
                                <Button className="w-full" size="lg">
                                    Sign In
                                </Button>
                            </SignInButton>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card text-muted-foreground px-2">or</span>
                                </div>
                            </div>

                            <SignUpButton mode="modal">
                                <Button variant="outline" className="w-full" size="lg">
                                    Create Account
                                </Button>
                            </SignUpButton>
                        </div>

                        <p className="text-muted-foreground text-center text-sm">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
                    </div>
                </div>
            </Unauthenticated>
        </>
    );
}
