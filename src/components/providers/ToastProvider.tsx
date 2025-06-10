import { useEffect } from "react";

import { useTheme } from "next-themes";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";

export const ToasterProvider = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  return <Toaster theme={theme as "light" | "dark"} closeButton richColors />;
};
