"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <Card className="w-[420px]">
                <CardHeader>
                    <CardTitle>Page Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">The page you are looking for doesn&apos;t exist or has been moved.</p>
                </CardContent>
                <CardFooter>
                    <Button asChild>
                        <Link to="/">Return Home</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
