/* eslint-disable @typescript-eslint/only-throw-error */
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    // Image uploader route
    imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async () => {
            // This code runs on your server before upload
            const { userId } = await auth();

            // If you throw, the user will not be able to upload
            if (!userId) throw new UploadThingError("Unauthorized");

            // Whatever is returned here is accessible in onUploadComplete as `metadata`
            return { userId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // This code RUNS ON YOUR SERVER after upload
            console.log("Upload complete for userId:", metadata.userId);
            console.log("file url", file.url);

            // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
            return { uploadedBy: metadata.userId, url: file.url, name: file.name, size: file.size };
        }),

    // PDF uploader route
    pdfUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 1 } })
        .middleware(async () => {
            const { userId } = await auth();
            if (!userId) throw new UploadThingError("Unauthorized");
            return { userId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("PDF upload complete for userId:", metadata.userId);
            console.log("file url", file.url);
            return { uploadedBy: metadata.userId, url: file.url, name: file.name, size: file.size };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
