import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/dashboard" reloadDocument className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">WealthWise</span>
        </Link>
        {/* <div className="hidden md:flex items-center gap-8">
          <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="/#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          <a href="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </div> */}
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="hover:-translate-y-0.5 transition-transform">
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button asChild variant="hero" size="default">
            <Link to="/auth?mode=signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
