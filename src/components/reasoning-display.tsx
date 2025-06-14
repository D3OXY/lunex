"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ReasoningDisplayProps {
    reasoning: string;
    isStreaming?: boolean;
}

export function ReasoningDisplay({ reasoning, isStreaming = false }: ReasoningDisplayProps): React.ReactElement {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!reasoning) {
        return <></>;
    }

    return (
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                type="button"
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Reasoning
                        {isStreaming && (
                            <span className="ml-2 inline-flex items-center">
                                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                                <span className="ml-1 text-xs text-blue-500">Thinking...</span>
                            </span>
                        )}
                    </span>
                </div>
                <span className="text-xs text-gray-500">{reasoning.length} characters</span>
            </button>

            {isExpanded && (
                <div className="px-3 pb-3">
                    <div className="rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-900">
                        <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {reasoning}
                            {isStreaming && <span className="animate-pulse">▋</span>}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
