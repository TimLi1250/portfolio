import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative paths make the build work for both a user site and a project Pages URL.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
