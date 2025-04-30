import { Database } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          <span className="text-xl font-semibold">DataHarbor</span>
        </Link>
        {/* Add Navigation or User Profile section here if needed */}
      </div>
    </header>
  );
}
