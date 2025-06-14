/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { cn } from "@/lib/utils";
import {
    type BundledLanguage,
    CodeBlock,
    CodeBlockBody,
    CodeBlockContent,
    CodeBlockCopyButton,
    CodeBlockFilename,
    CodeBlockFiles,
    CodeBlockHeader,
    CodeBlockItem,
    type CodeBlockProps,
    CodeBlockSelect,
    CodeBlockSelectContent,
    CodeBlockSelectItem,
    CodeBlockSelectTrigger,
    CodeBlockSelectValue,
} from "@/components/ui/kibo-ui/code-block";
import { memo } from "react";
import type { HTMLAttributes } from "react";
import ReactMarkdown, { type Options } from "react-markdown";
import remarkGfm from "remark-gfm";

export type AIResponseProps = HTMLAttributes<HTMLDivElement> & {
    options?: Options;
    children: Options["children"];
};

const components: Options["components"] = {
    p: ({ node, children, className, ...props }) => (
        <p className={cn("mb-4 text-base leading-relaxed tracking-wide", className)} {...props}>
            {children}
        </p>
    ),
    pre: ({ children }) => <div>{children}</div>,
    ol: ({ node, children, className, ...props }) => (
        <ol className={cn("ml-4 list-outside list-decimal", className)} {...props}>
            {children}
        </ol>
    ),
    li: ({ node, children, className, ...props }) => (
        <li className={cn("py-1", className)} {...props}>
            {children}
        </li>
    ),
    ul: ({ node, children, className, ...props }) => (
        <ul className={cn("ml-4 list-outside list-decimal", className)} {...props}>
            {children}
        </ul>
    ),
    strong: ({ node, children, className, ...props }) => (
        <span className={cn("font-semibold", className)} {...props}>
            {children}
        </span>
    ),
    a: ({ node, children, className, ...props }) => (
        <a className={cn("text-primary font-medium underline", className)} target="_blank" rel="noreferrer" {...props}>
            {children}
        </a>
    ),
    h1: ({ node, children, className, ...props }) => (
        <h1 className={cn("mt-6 mb-2 text-3xl font-semibold", className)} {...props}>
            {children}
        </h1>
    ),
    h2: ({ node, children, className, ...props }) => (
        <h2 className={cn("mt-6 mb-2 text-2xl font-semibold", className)} {...props}>
            {children}
        </h2>
    ),
    h3: ({ node, children, className, ...props }) => (
        <h3 className={cn("mt-6 mb-2 text-xl font-semibold", className)} {...props}>
            {children}
        </h3>
    ),
    h4: ({ node, children, className, ...props }) => (
        <h4 className={cn("mt-6 mb-2 text-lg font-semibold", className)} {...props}>
            {children}
        </h4>
    ),
    h5: ({ node, children, className, ...props }) => (
        <h5 className={cn("mt-6 mb-2 text-base font-semibold", className)} {...props}>
            {children}
        </h5>
    ),
    h6: ({ node, children, className, ...props }) => (
        <h6 className={cn("mt-6 mb-2 text-sm font-semibold", className)} {...props}>
            {children}
        </h6>
    ),
    code: ({ node, className, children }) => {
        // Check if it's a fenced code block by looking for "language-" in the className prop
        const isFencedCodeBlock = typeof className === "string" && className.includes("language-");

        if (!isFencedCodeBlock) {
            // Inline code
            return <code className={cn("bg-muted rounded px-1.5 py-0.5 font-mono text-base tracking-wide", className)}>{children}</code>;
        }

        let language = "javascript"; // Default to javascript for safety

        // Extract language from the className prop for fenced code blocks
        if (typeof className === "string") {
            const languageClass = className.split(" ").find((cls) => cls.startsWith("language-"));
            if (languageClass) {
                language = languageClass.replace("language-", "");
            }
        }

        const languageToFileExtension: Record<string, string> = {
            javascript: "js",
            typescript: "ts",
            python: "py",
            html: "html",
            css: "css",
            json: "json",
            bash: "sh",
            nginx: "conf",
            // Add more as needed
        };

        const fileExtension = languageToFileExtension[language] ?? language;

        const data: CodeBlockProps["data"] = [
            {
                language,
                filename: `code.${fileExtension}`,
                code: children as string,
            },
        ];

        return (
            <CodeBlock className={cn("my-4", className)} data={data} defaultValue={data[0]?.language}>
                <CodeBlockHeader>
                    <CodeBlockFiles>
                        {(item) => (
                            <CodeBlockFilename key={item.language} value={item.language}>
                                {item.filename}
                            </CodeBlockFilename>
                        )}
                    </CodeBlockFiles>
                    <CodeBlockSelect>
                        <CodeBlockSelectTrigger>
                            <CodeBlockSelectValue />
                        </CodeBlockSelectTrigger>
                        <CodeBlockSelectContent>
                            {(item) => (
                                <CodeBlockSelectItem key={item.language} value={item.language}>
                                    {item.language}
                                </CodeBlockSelectItem>
                            )}
                        </CodeBlockSelectContent>
                    </CodeBlockSelect>
                    <CodeBlockCopyButton onCopy={() => console.info("Copied code to clipboard")} onError={() => console.error("Failed to copy code to clipboard")} />
                </CodeBlockHeader>
                <CodeBlockBody>
                    {(item) => (
                        <CodeBlockItem key={item.language} value={item.language}>
                            <CodeBlockContent language={item.language as BundledLanguage}>{item.code}</CodeBlockContent>
                        </CodeBlockItem>
                    )}
                </CodeBlockBody>
            </CodeBlock>
        );
    },
};

export const AIResponse = memo(
    ({ className, options, children, ...props }: AIResponseProps) => (
        <div className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)} {...props}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} {...options}>
                {children}
            </ReactMarkdown>
        </div>
    ),
    (prevProps, nextProps) => prevProps.children === nextProps.children
);

AIResponse.displayName = "AIResponse";
