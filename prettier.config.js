/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
    trailingComma: "es5",
    tabWidth: 4,
    semi: true,
    singleQuote: false,
    printWidth: 180,
    plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
