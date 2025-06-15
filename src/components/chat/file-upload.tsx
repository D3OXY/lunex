"use client";

import { useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { useChatStore, type FileAttachment } from "@/lib/stores/chat-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageIcon, FileTextIcon, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
    onUploadComplete?: (attachments: FileAttachment[]) => void;
}

interface UploadFileResponse {
    name: string;
    size: number;
    key: string;
    url: string;
    customId: string | null;
    serverData: unknown;
}

export function FileUpload({ onUploadComplete }: FileUploadProps): React.JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const { addAttachment } = useChatStore();

    const { startUpload: startImageUpload, isUploading: isImageUploading } = useUploadThing("imageUploader", {
        onClientUploadComplete: (res: UploadFileResponse[]) => {
            const attachment: FileAttachment = {
                url: res[0]?.url ?? "",
                name: res[0]?.name ?? "",
                size: res[0]?.size ?? 0,
                type: "image",
            };
            addAttachment(attachment);
            onUploadComplete?.([attachment]);
            toast.success(`Image uploaded: ${attachment.name}`);
            setIsOpen(false);
        },
        onUploadError: (error: Error) => {
            toast.error(`Image upload failed: ${error.message}`);
        },
    });

    const { startUpload: startPdfUpload, isUploading: isPdfUploading } = useUploadThing("pdfUploader", {
        onClientUploadComplete: (res: UploadFileResponse[]) => {
            const attachment: FileAttachment = {
                url: res[0]?.url ?? "",
                name: res[0]?.name ?? "",
                size: res[0]?.size ?? 0,
                type: "pdf",
            };
            addAttachment(attachment);
            onUploadComplete?.([attachment]);
            toast.success(`PDF uploaded: ${attachment.name}`);
            setIsOpen(false);
        },
        onUploadError: (error: Error) => {
            toast.error(`PDF upload failed: ${error.message}`);
        },
    });

    const isUploading = isImageUploading || isPdfUploading;

    const handleFileSelect = (files: File[]): void => {
        if (files.length === 0) return;

        const file = files[0];
        if (!file) return;

        // Check file type and size for cost optimization
        if (file.type.startsWith("image/")) {
            if (file.size > 4 * 1024 * 1024) {
                toast.error("Image must be less than 4MB");
                return;
            }
            void startImageUpload([file]);
        } else if (file.type === "application/pdf") {
            if (file.size > 16 * 1024 * 1024) {
                toast.error("PDF must be less than 16MB");
                return;
            }
            void startPdfUpload([file]);
        } else {
            toast.error("Only images and PDFs are supported");
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        handleFileSelect(files);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Upload size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Drag and Drop Area */}
                    <div
                        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                                <p className="text-muted-foreground text-sm">Uploading...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="text-muted-foreground h-8 w-8" />
                                <p className="text-sm font-medium">Drop files here or click to browse</p>
                                <p className="text-muted-foreground text-xs">Images (max 4MB) • PDFs (max 16MB)</p>
                            </div>
                        )}
                    </div>

                    {/* File Input Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            className="h-20 flex-col gap-2"
                            disabled={isUploading}
                            onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e) => {
                                    const files = Array.from((e.target as HTMLInputElement).files ?? []);
                                    handleFileSelect(files);
                                };
                                input.click();
                            }}
                        >
                            <ImageIcon className="h-6 w-6" />
                            <span className="text-xs">Images</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-20 flex-col gap-2"
                            disabled={isUploading}
                            onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "application/pdf";
                                input.onchange = (e) => {
                                    const files = Array.from((e.target as HTMLInputElement).files ?? []);
                                    handleFileSelect(files);
                                };
                                input.click();
                            }}
                        >
                            <FileTextIcon className="h-6 w-6" />
                            <span className="text-xs">PDFs</span>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
