import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake large barrel-export packages so importing a few icons/components
  // doesn't pull the entire library into each page's module graph. This is the
  // single biggest win for page-to-page navigation speed (lucide-react alone
  // exports thousands of modules).
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-progress",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
  },
};

export default nextConfig;
