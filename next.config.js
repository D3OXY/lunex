import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  rewrites: async () => {
    return [
      {
        source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
        destination: "/shell",
      },
    ];
  },
};

export default config;
