"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/client/app"), { ssr: false });

export default function Shell() {
  return <App />;
}
