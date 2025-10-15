import Link from "next/link";
import Image from "next/image";
import { Camera, BarChart3, BotMessageSquare, Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-24 md:py-40 lg:py-48 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_200%_100%_at_50%_-20%,rgba(16,185,129,0.3),rgba(255,255,255,0))] animate-aurora"></div>
          <div className="container px-4 md:px-6 text-center relative z-10">
            <div className="flex flex-col items-center space-y-6">
              <Badge variant="outline" className="py-2 px-4 rounded-full text-sm border-primary/30 bg-primary/10 text-primary animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Sparkles className="w-4 h-4 mr-2" />
                Powered by Gemini Flash
              </Badge>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-gradient animate-in fade-in slide-in-from-bottom-6 duration-700">
                Sovereign Food Intelligence
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl animate-in fade-in slide-in-from-bottom-8 duration-900">
                Achieve **pure accuracy** with our revolutionary AI. Get instant nutrition facts,
                complete ingredient breakdowns, and advanced health insights.
              </p>
              <Link href="/scan">
                <Button size="lg" className="mt-6 animate-in fade-in zoom-in-95 duration-1000">
                  <Camera className="mr-2 h-5 w-5" />
                  Initiate Scan
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gradient">A New Standard in Nutritional Analysis</h2>
              <p className="max-w-[900px] mx-auto text-muted-foreground md:text-xl/relaxed mt-4">
                Our platform leverages a multi-layered AI approach to provide unparalleled accuracy and depth.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-stretch gap-8 lg:grid-cols-3">
              <FeatureCard
                icon={<BotMessageSquare className="h-10 w-10 text-primary" />}
                title="Multi-Ingredient Detection"
                description="Our AI deconstructs entire meals into individual components for the most precise analysis available."
                imageUrl="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1981&auto=format&fit=crop"
              />
              <FeatureCard
                icon={<Database className="h-10 w-10 text-primary" />}
                title="Comprehensive Data"
                description="Powered by the official USDA database for detailed macro and micronutrient information."
                imageUrl="https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070&auto=format&fit=crop"
              />
              <FeatureCard
                icon={<BarChart3 className="h-10 w-10 text-primary" />}
                title="Personalized Dashboard"
                description="Log your meals and track your nutritional intake over time to achieve your specific health goals."
                imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const FeatureCard = ({ icon, title, description, imageUrl }: { icon: React.ReactNode, title: string, description: string, imageUrl: string }) => (
    <Card className="h-full overflow-hidden group">
      <div className="relative h-48">
        <Image src={imageUrl} alt={title} fill style={{objectFit: 'cover'}} className="transition-transform duration-500 group-hover:scale-105" />
      </div>
      <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4 border border-primary/20">
              {icon}
          </div>
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
);