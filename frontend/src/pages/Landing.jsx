import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Wallet,
  PieChart,
  Target,
  Receipt,
  ArrowRight,
  Zap,
  Gauge,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: PieChart,
    title: "AI Spending Predictions",
    description: "Forecast upcoming expenses and cash flow using lightweight ML models.",
  },
  {
    icon: Receipt,
    title: "OCR Receipt Scanning",
    description: "Upload receipts and automatically extract merchant, date, amount and category.",
  },
  {
    icon: Wallet,
    title: "Smart Budget Tracking",
    description: "Create budgets, track in real-time, and get actionable alerts.",
  },
  {
    icon: Target,
    title: "Goal Setting & Monitoring",
    description: "Define savings goals and monitor progress with clear visuals.",
  },
  {
    icon: Gauge,
    title: "Interactive Dashboard",
    description: "Intuitive charts and tables to review transactions and trends.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Sign Up & Connect",
    description: "Create your account in seconds and securely connect your financial data.",
  },
  {
    step: "2",
    title: "Add Transactions",
    description: "Manually add expenses or scan receipts with OCR for instant categorization.",
  },
  {
    step: "3",
    title: "Set Goals & Budgets",
    description: "Define your financial targets and budget limits tailored to your needs.",
  },
  {
    step: "4",
    title: "Get AI Insights",
    description: "Receive predictions and recommendations powered by machine learning.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ============ HERO SECTION ============ */}
      <section className="py-20 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-30" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        {/* Floating Cards - Left Side */}
        <div className="hidden lg:block absolute left-8 top-1/4 animate-float">
          <Card className="glass p-4 w-48 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-lg font-bold text-foreground">₹45,230</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="hidden lg:block absolute left-16 bottom-1/4 animate-float" style={{ animationDelay: '1s' }}>
          <Card className="glass p-4 w-44 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Savings</p>
                <p className="text-sm font-semibold text-emerald-600">+₹12,000</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Floating Cards - Right Side */}
        <div className="hidden lg:block absolute right-8 top-1/3 animate-float" style={{ animationDelay: '0.5s' }}>
          <Card className="glass p-4 w-44 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scanned</p>
                <p className="text-lg font-bold text-foreground">156</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="hidden lg:block absolute right-12 bottom-1/3 animate-float" style={{ animationDelay: '1.5s' }}>
          <Card className="glass p-4 w-48 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm font-semibold text-primary">82% on track</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="container mx-auto relative z-10 max-w-5xl">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Financial Planning</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              AI-Powered Personal Finance Planner
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Take control of your finances with intelligent tracking, OCR receipt scanning, and AI-driven insights. 
              Built for the modern financial planner.
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button variant="hero" size="lg" className="group bg-emerald-600 hover:bg-emerald-700">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/auth?mode=login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Already have an account? <span className="font-medium underline">Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section id="features" className="py-16 md:py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to take control of your financial future
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} variant="elevated" className="group hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS SECTION ============ */}
      <section id="how-it-works" className="py-16 md:py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in four simple steps and start planning smarter today.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <Card variant="elevated" className="h-full">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-4 text-sm">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </CardContent>
                </Card>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROJECT STACK SECTION ============ */}
      <section id="stack" className="py-16 md:py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Built With Modern Tech</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Leveraging the best tools for performance, scalability, and developer experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { name: "React", desc: "Frontend UI with hooks and modern tooling" },
              { name: "FastAPI", desc: "Backend APIs and services, Python-powered" },
              { name: "Supabase", desc: "Auth and Postgres database integration" },
              { name: "Python ML", desc: "Lightweight models for predictions" },
            ].map((tech, idx) => (
              <Card key={idx} variant="elevated">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">{tech.name}</h3>
                  <p className="text-sm text-muted-foreground">{tech.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className="py-16 md:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-emerald opacity-5" />
        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Start Planning Your Financial Future Today</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join users who are taking control of their finances with AI-powered insights and intelligent tracking.
            </p>
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="lg" className="group">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Start immediately • Full feature access
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
