import FoodScanner from '@/components/FoodScanner'
import { BotMessageSquare, Sparkles, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function ScanPage() {
  return (
    <div className="w-full min-h-screen relative overflow-hidden">
      {/* Premium Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background grid-pattern"></div>
        <div className="absolute inset-0 radial-gradient"></div>
        <div className="absolute top-40 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Content */}
      <div className="container section-padding relative z-10">
        {/* Header Section - Enhanced */}
        <div className="flex flex-col items-center space-y-8 text-center mb-16 max-w-4xl mx-auto">
          <Badge variant="secondary" className="py-3 px-6 rounded-full text-sm glass pulse-glow border-emerald-500/30 animate-in fade-in zoom-in-95 duration-500">
            <BotMessageSquare className="w-5 h-5 mr-2 text-emerald-400" />
            <span className="text-gradient font-semibold">Advanced AI Vision Analysis</span>
          </Badge>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="text-gradient-premium">Upload Your Meal</span>
          </h1>
          
          <p className="max-w-[800px] text-muted-foreground text-lg md:text-xl leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-900">
            Our <span className="text-emerald-400 font-semibold">Claude AI</span> deconstructs your meal into individual components, 
            providing <span className="text-teal-400 font-semibold">unmatched analytical depth</span> with comprehensive nutritional insights.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 animate-in fade-in duration-1000">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-muted-foreground">Instant Analysis</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="text-muted-foreground">Multi-Food Detection</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
              <BotMessageSquare className="w-4 h-4 text-cyan-400" />
              <span className="text-muted-foreground">AI-Powered Accuracy</span>
            </div>
          </div>
        </div>
        
        {/* Scanner Component - With Glass Card Wrapper */}
        <div className="max-w-5xl mx-auto">
          <FoodScanner />
        </div>
      </div>
    </div>
  )
}