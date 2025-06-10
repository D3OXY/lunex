import { cn } from "@/lib/utils";
import "../styles/loader.css";

export function LoaderItem() {
  return (
    <div className="loader">
      <span>{"{"}</span>
      <span>{"}"}</span>
    </div>
  );
}

export default function Loader({
  page = false,
  text,
}: {
  page?: boolean;
  text?: string;
}) {
  if (page) {
    return (
      <main className="flex h-screen w-full flex-col items-center justify-center gap-2">
        <LoaderItem />
        <span
          className={cn(
            "font-oswald text-base",
            text ? "animate-pulse opacity-100" : "opacity-0",
          )}
        >
          {text ?? "Loading..."}
        </span>
      </main>
    );
  }

  return <LoaderItem />;
}
