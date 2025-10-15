import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Brain, Database, Sparkles, BotMessageSquare } from 'lucide-react'

const features = [
  {
    icon: BotMessageSquare,
    title: 'Multi-Ingredient AI Recognition',
  description: 'Our Gemini Flash core deconstructs entire meals into their individual components for unparalleled analytical depth.',
  tech: 'Gemini Flash'
  },
  {
    icon: Database,
    title: 'Comprehensive Nutrition Data',
    description: 'We leverage the official USDA Food Database for detailed and accurate nutritional information.',
    tech: 'USDA FoodData Central'
  },
  {
    icon: Eye,
    title: 'Advanced Computer Vision',
    description: 'A multi-layered vision stack ensures high-accuracy identification of a vast range of foods.',
    tech: 'Clarifai & Tesseract'
  },
  {
    icon: Brain,
    title: 'Smart Health Analysis',
    description: 'Receive personalized health insights, a dynamic health score, and actionable suggestions for any meal.',
    tech: 'Proprietary AI Models'
  }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen py-20 md:py-32">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-20">
            <Badge variant="secondary" className="py-2 px-4 rounded-full text-sm border-accent/20 bg-accent/10 text-accent-foreground mb-4">
                <Sparkles className="w-4 h-4 mr-2" />
                Our Mission & Technology
            </Badge>
          <h1 className="text-5xl font-bold text-gradient-primary mb-6">
            Engineering a New Standard
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            NutriScan is not just a food scanner; it is a sovereign-grade intelligence instrument. We combine multiple best-in-class AI models and data sources to provide a level of analytical depth that is simply unmatched.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="h-full transform transition-all duration-300 hover:-translate-y-2 hover:shadow-primary/30">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <Badge variant="secondary" className="mt-2">{feature.tech}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}