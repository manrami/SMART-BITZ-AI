import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Lightbulb,
  User,
  LogOut,
  FolderOpen,
  ShoppingBag,
  Bot,
  LayoutDashboard,
  Trophy,
  UserCircle,
  FileCheck,
  TrendingUp,
  BookOpen,
  Users2,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { user, signOut } = useAuth();
  const [hasBusiness, setHasBusiness] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkBusiness = () => {
      const storedBusiness = sessionStorage.getItem("selectedBusiness");
      setHasBusiness(!!storedBusiness);
    };

    checkBusiness();
    window.addEventListener("storage", checkBusiness);
    return () => window.removeEventListener("storage", checkBusiness);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled
        ? "bg-background/95 backdrop-blur-md border-b border-border shadow-lg"
        : "bg-transparent border-b border-transparent"
        }`}
    >
      <div
        className={`container flex h-16 items-center justify-between relative ${!scrolled ? "text-shadow-glow" : ""}`}
      >
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground transition-transform group-hover:scale-110 group-hover:rotate-6 shadow-glow">
            <Lightbulb className="h-5 w-5" />
          </div>
          <span className="ml-2 text-xl font-semibold tracking-tight gradient-text">
            SmartBiz AI
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {!isHome && (
            <Link to="/">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
          )}

          {hasBusiness && (
            <Link to="/plan">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary font-medium hover:bg-primary/10"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          )}

          <Link to="/marketplace">
            <Button variant="ghost" size="sm" className="hover:bg-accent/50">
              <ShoppingBag className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Marketplace</span>
            </Button>
          </Link>

          <Link to="/ai-agent">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <Bot className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline font-medium">Talk to AI</span>
            </Button>
          </Link>

          <Link to="/scoreboard">
            <Button variant="ghost" size="sm" className="hover:bg-accent/50">
              <Trophy className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Button>
          </Link>

          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-[100px] truncate">
                      {user.email?.split("@")[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <UserCircle className="h-4 w-4 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/saved-plans" className="cursor-pointer">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Saved Plans
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/compliance" className="cursor-pointer">
                      <FileCheck className="h-4 w-4 mr-2" />
                      Compliance Center
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/insights" className="cursor-pointer">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Market Insights
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/khata" className="cursor-pointer">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Digital Khata & ERP
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/community" className="cursor-pointer">
                      <Users2 className="h-4 w-4 mr-2" />
                      Founder Community
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/competitor" className="cursor-pointer">
                      <Target className="h-4 w-4 mr-2" />
                      Competitor Analysis
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/scoreboard" className="cursor-pointer">
                      <Trophy className="h-4 w-4 mr-2" />
                      Leaderboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="ghost" size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}

          <ThemeToggle />
          <Link to="/start">
            <Button
              variant={isHome ? "hero" : "default"}
              size="sm"
              className="shadow-glow hover:shadow-glow-lg"
            >
              Get Started
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
