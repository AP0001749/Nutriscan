import Link from "next/link";
import Image from "next/image";
import { Camera, BarChart3, BotMessageSquare, Database, Sparkles, Zap, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background grid-pattern"></div>
        <div className="absolute top-0 left-0 w-full h-full radial-gradient"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <main className="flex-1 relative z-10">
        {/* Hero Section - Dramatically Enhanced */}
        <section className="w-full section-padding relative">
          <div className="container text-center">
            <div className="flex flex-col items-center space-y-8 max-w-5xl mx-auto">
              {/* Premium Badge */}
              <Badge variant="outline" className="py-2.5 px-5 rounded-full text-sm glass pulse-glow border-emerald-500/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Sparkles className="w-4 h-4 mr-2 text-emerald-400" />
                <span className="text-gradient font-semibold">Powered by Claude 3.5 Haiku AI</span>
              </Badge>

              {/* Hero Title - Enhanced */}
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="text-gradient-premium">Sovereign Food</span>
                <br />
                <span className="text-foreground">Intelligence</span>
              </h1>

              {/* Subtitle - Refined */}
              <p className="mx-auto max-w-[800px] text-muted-foreground text-lg md:text-xl leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-900">
                Experience <span className="text-emerald-400 font-semibold">unparalleled accuracy</span> with our revolutionary AI platform. 
                Get instant nutrition analysis, complete ingredient breakdowns, and advanced health insights—all in seconds.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4 animate-in fade-in zoom-in-95 duration-1000">
                <Link href="/scan">
                  <Button size="lg" className="btn-premium text-base px-8 py-6 font-semibold">
                    <Camera className="mr-2 h-5 w-5" />
                    Start Scanning Now
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="glass-card text-base px-8 py-6 font-semibold border-emerald-500/30 hover:border-emerald-500/50">
                    <Shield className="mr-2 h-5 w-5" />
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-8 mt-12 text-sm text-muted-foreground animate-in fade-in duration-1100">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Instant Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>USDA Verified Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>95%+ Accuracy</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Premium Design */}
        <section className="w-full section-padding">
          <div className="container">
            {/* Section Header */}
            <div className="text-center mb-16 space-y-4">
              <Badge variant="secondary" className="glass text-emerald-400 border-emerald-500/30">
                Premium Features
              </Badge>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="text-gradient">A New Standard</span>
                <br />
                <span className="text-foreground">in Nutritional Analysis</span>
              </h2>
              <p className="max-w-[700px] mx-auto text-muted-foreground text-lg">
                Our platform leverages multi-layered AI and comprehensive databases to deliver unmatched precision.
              </p>
            </div>

            {/* Feature Cards - Glassmorphism */}
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
              <FeatureCard
                icon={<BotMessageSquare className="h-12 w-12" />}
                title="AI Vision Analysis"
                description="Advanced Claude AI deconstructs entire meals into individual components with unprecedented accuracy."
                imageUrl="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1981&auto=format&fit=crop"
                gradient="from-emerald-500/20 to-teal-500/20"
              />
              <FeatureCard
                icon={<Database className="h-12 w-12" />}
                title="USDA Database"
                description="Powered by official USDA FoodData Central for comprehensive macro and micronutrient information."
                imageUrl="https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070&auto=format&fit=crop"
                gradient="from-teal-500/20 to-cyan-500/20"
              />
              <FeatureCard
                icon={<BarChart3 className="h-12 w-12" />}
                title="Smart Dashboard"
                description="Log meals and track nutritional intake over time with intelligent insights and personalized recommendations."
                imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                gradient="from-cyan-500/20 to-blue-500/20"
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-20 relative">
          <div className="container">
            <div className="glass-card rounded-3xl p-12 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                <StatCard number="95%+" label="Accuracy Rate" />
                <StatCard number="< 2s" label="Analysis Time" />
                <StatCard number="1000+" label="Foods Detected" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  imageUrl,
  gradient 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  imageUrl: string;
  gradient: string;
}) => (
  <Card className="h-full overflow-hidden group glass-card card-interactive border-0">
    <div className="relative h-56 overflow-hidden">
      <Image 
        src={imageUrl} 
        alt={title} 
        fill 
        style={{objectFit: 'cover'}} 
        className="transition-transform duration-700 group-hover:scale-110"
      />
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} mix-blend-overlay`}></div>
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent"></div>
    </div>
    <CardContent className="p-8 flex flex-col items-center text-center space-y-4 relative">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-4 border border-emerald-500/20 shimmer">
        <div className="text-emerald-400">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </CardContent>
  </Card>
);

const StatCard = ({ number, label }: { number: string; label: string }) => (
  <div className="space-y-2">
    <div className="text-5xl font-black text-gradient-premium">{number}</div>
    <div className="text-muted-foreground font-medium">{label}</div>
  </div>
);