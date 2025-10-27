# NutriScan - Smart Food Analysis & Nutrition Tracker

NutriScan is an AI-powered food analysis application that uses computer vision and machine learning to identify food items, provide detailed nutrition information, health insights, and find the best prices for your groceries.

## Features

### 🤖 AI-Powered Food Recognition
- **Advanced AI Vision**: State-of-the-art computer vision for accurate food identification
- **Multi-food Detection**: Recognizes multiple food items in a single image
- **Real-time Analysis**: Instant food recognition from photos

### 💡 Smart Health Insights
- **Smart AI Analysis**: Personalized health recommendations and analysis
- **Health Score**: Get a health score from 1-100 for any meal
- **Custom Suggestions**: AI-powered recommendations to improve your nutrition

### 📊 Comprehensive Nutrition Data
- **USDA Database**: Access to the complete USDA FoodData Central database
- **Detailed Nutrients**: Complete breakdown of vitamins, minerals, and macronutrients
- **Calorie Tracking**: Accurate calorie information for all foods

### 📝 Food Diary & Dashboard
- **Log Meals**: Easily log breakfast, lunch, dinner, and snacks.
- **Daily Summary**: View your total caloric intake and meal history on the dashboard.
- **Clear History**: Option to clear the day's logged meals.

### ✍️ Educational Blog
- **Nutrition Science**: Learn about the latest in nutrition research
- **Food Technology**: Understand how AI and food recognition work
- **Healthy Living**: Tips and guides for better eating habits

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern, responsive styling
- **shadcn/ui**: Re-usable UI components
- **Lucide React**: Beautiful, consistent icons

### Backend & Database
- **Next.js API Routes**: Server-side API endpoints
- **Advanced AI Vision**: Food recognition and image analysis
- **Smart AI Analysis**: Natural language processing and health insights
- **Vercel Postgres**: Cloud database for meal logging

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
 - Google Gemini Flash (recommended)
- Nutritionix API account for nutrition data

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd nutriscan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file and add your API keys:
   ```bash
   # AI & Vision APIs
   GEMINI_API_KEY=your_gemini_api_key
   CLARIFAI_API_KEY=your_clarifai_api_key
   USDA_API_KEY=your_usda_api_key
   
   # NextAuth Configuration
   NEXTAUTH_SECRET=your_random_secret_string
   NEXTAUTH_URL=http://localhost:3000
   
   # OAuth Providers (Optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   
   # Database
   DATABASE_URL=your_database_connection_string
   ```
   
   **Note**: For development, the credentials provider allows any email/password. For production, configure OAuth providers or implement proper user authentication.

4. **Initialize the database**
   The first time you run the app, navigate to `/api/init-db` in your browser to create the necessary database tables.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Scanning Food
1. Navigate to the "Scan" page
2. Take a photo or upload an image of your food
3. Wait for AI analysis (usually 2-5 seconds)
4. View detailed nutrition information and health insights
5. Log the meal to your Food Diary from the results page

### Dashboard
1. Visit the "Dashboard" to see your logged meals for the day.
2. Clear the daily log if needed.

## Deployment

This application uses **PostgreSQL** via `@vercel/postgres` for serverless compatibility. The database layer is production-ready for platforms like Vercel, Netlify, and other serverless environments.

### Prerequisites
1. **PostgreSQL Database**: Set up a serverless Postgres instance:
   - **Vercel Postgres**: [Create in Vercel Dashboard](https://vercel.com/docs/storage/vercel-postgres)
   - **Neon**: [Sign up and create database](https://neon.tech/)
   - **Supabase**: [Create project](https://supabase.com/)

2. **Environment Variables**: Copy `.env.example` to `.env.local` and configure:
   ```bash
   # NextAuth
   NEXTAUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3000  # Update for production

   # Database
   POSTGRES_URL=your-postgres-connection-string
   POSTGRES_PRISMA_URL=your-prisma-connection-string
   POSTGRES_URL_NON_POOLING=your-non-pooling-connection-string

   # OAuth (optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # AI APIs (at least one required)
   GEMINI_API_KEY=your-gemini-api-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   CLARIFAI_PAT=your-clarifai-pat
   USDA_API_KEY=your-usda-api-key
   ```

### Deploy to Vercel
1. **Push to GitHub**:
   ```bash
   git push origin master
   ```

2. **Import to Vercel**:
   - Visit [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure environment variables in project settings

3. **Set up Vercel Postgres** (recommended):
   - Go to Storage tab in your Vercel project
   - Create Postgres database
   - Vercel automatically sets `POSTGRES_URL` and related vars

4. **Initialize Database Schema**:
   - After first deploy, visit: `https://your-app.vercel.app/api/init-db`
   - Or run migration script locally pointing to production DB

5. **Verify Deployment**:
   - Check `/api/auth/providers` returns configured providers
   - Test `/api/env-check` to verify environment variables (secure this endpoint in production!)

### Local Development
1. Build the project:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## API Providers & Configuration

NutriScan integrates with multiple AI and data providers for comprehensive food analysis. The application uses a **fallback cascade** strategy - if one provider is unavailable, it automatically tries the next.

### Required API Providers

At least **one** of the following AI vision providers is required:

#### 1. Google Gemini (Recommended)
- **Purpose**: Food recognition and health analysis
- **Free Tier**: 60 requests/minute, completely free
- **Cost**: Free for most use cases
- **Setup**: Get API key at [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Environment Variables**:
  ```bash
  GEMINI_API_KEY=your_gemini_api_key
  GEMINI_MODEL=gemini-1.5-flash  # Optional, this is the default
  ```
- **Why Recommended**: Best accuracy, generous free tier, fastest response times

#### 2. Anthropic Claude
- **Purpose**: Advanced food analysis and health insights
- **Free Tier**: $5 free credit on signup
- **Cost**: Pay-as-you-go after free credit
- **Setup**: Get API key at [Anthropic Console](https://console.anthropic.com/)
- **Environment Variables**:
  ```bash
  ANTHROPIC_API_KEY=your_anthropic_api_key
  ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # Optional
  ```
- **Best For**: Detailed health analysis and dietary recommendations

#### 3. Clarifai
- **Purpose**: Image recognition and food classification
- **Free Tier**: 1,000 operations/month free
- **Cost**: $1.20 per 1,000 operations after free tier
- **Setup**: Get PAT at [Clarifai Portal](https://clarifai.com/settings/security)
- **Environment Variables**:
  ```bash
  CLARIFAI_PAT=your_clarifai_personal_access_token
  ```
- **Best For**: Multi-food detection in complex images

### Optional API Providers

#### USDA FoodData Central
- **Purpose**: Detailed nutrition data from official USDA database
- **Free Tier**: Completely free, no rate limits
- **Setup**: Get API key at [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-signup.html)
- **Environment Variables**:
  ```bash
  USDA_API_KEY=your_usda_api_key
  ```
- **Note**: Falls back to built-in nutrition database if not configured

#### Nutritionix
- **Purpose**: Additional nutrition data and fallback provider
- **Free Tier**: Limited free tier available
- **Setup**: Sign up at [Nutritionix API](https://www.nutritionix.com/business/api)
- **Environment Variables**:
  ```bash
  NUTRITIONIX_APP_ID=your_app_id
  NUTRITIONIX_API_KEY=your_api_key
  ```
- **Note**: Optional - used as fallback when primary nutrition sources fail

### API Cascade Strategy

The application tries providers in this order:
1. **Vision Recognition**: Gemini → Anthropic → Clarifai → HuggingFace (free) → Demo fallback
2. **Nutrition Data**: USDA → Nutritionix → Built-in database
3. **Health Analysis**: Gemini → Anthropic → Basic analysis

### Cost Estimation

For a typical user (30 scans/day):
- **Gemini Only**: $0/month (stays within free tier)
- **Anthropic Only**: ~$2-5/month after free credit
- **Clarifai Only**: Free (under 1,000/month)
- **USDA**: Always free
- **Nutritionix**: Free for basic usage

### Recommended Setup

**For Development**:
```bash
GEMINI_API_KEY=your_key  # Only this is needed
```

**For Production**:
```bash
# Primary providers
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key

# Data sources
USDA_API_KEY=your_usda_key

# Fallback
CLARIFAI_PAT=your_clarifai_pat
```

## Project Structure

```
nutriscan/
├── public/             # Static assets
├── src/
│   ├── app/            # Next.js 15 app directory
│   │   ├── api/        # API route handlers
│   │   │   ├── scan-food/          # Main food scanning endpoint
│   │   │   ├── nutritionix-vision/ # Nutritionix fallback provider
│   │   │   ├── prices/             # Price comparison API
│   │   │   ├── log-meal/           # Meal logging
│   │   │   └── env-check/          # Environment validation (dev only)
│   │   ├── blog/       # Blog pages
│   │   ├── scan/       # Scan page
│   │   ├── about/      # About page
│   │   └── page.tsx    # Home page
│   ├── components/     # React components
│   │   ├── ui/         # UI components (buttons, cards, etc.)
│   │   └── ...         # Feature components
│   ├── lib/            # Utility functions
│   │   ├── gemini-client.ts      # Gemini AI integration
│   │   ├── anthropic-client.ts   # Anthropic integration
│   │   ├── huggingface-client.ts # HuggingFace fallback
│   │   ├── database.ts           # Postgres operations
│   │   └── demo-data.ts          # Fallback mock data
│   └── types/          # TypeScript type definitions
```

## Recent Updates

- Fixed hydration errors related to environment variables by implementing client-side detection
- Added new About page with detailed information about the application
- Improved responsive design for better mobile experience
- Enhanced error handling for API calls

## Authentication

NutriScan uses **NextAuth.js** for authentication with support for multiple providers:

### Supported Authentication Methods
1. **Google OAuth** - Sign in with Google account
3. **Credentials** - Email/password authentication (development mode accepts any credentials)

### Setting Up OAuth Providers

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to your `.env.local`

### Generating NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

## API Keys Configuration

For full functionality, this application requires the following API keys:

1. **Google Gemini** - For AI-powered food analysis and health insights
2. **Clarifai API** - For advanced food recognition with 98% accuracy
3. **USDA FoodData Central API** - For comprehensive nutrition information

We've made it easy to set up your API keys:

1. First, configure your API keys in `.env.local` file
2. Verify your configuration by visiting `/api/env-check`

3. Start the application with API keys check:
   ```bash
   npm run dev:with-api-check
   ```

The application includes a demo mode that activates automatically if API keys are not found, but for the best experience, we recommend configuring all APIs.

### Using Anthropic (Claude Haiku 3) Free Tier

NutriScan is configured to use Anthropic's Claude models by default. To use the free tier / Haiku 3 model set the following environment variable in your `.env.local` file:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
# optional, defaults to claude-haiku-3
ANTHROPIC_MODEL=claude-haiku-3
```

Notes:
- The app uses a minimal fetch-based client so no extra SDK is required. The `ANTHROPIC_MODEL` variable lets you change the model if you have access to other Anthropic models.
- Confirm your Anthropic account limits — "free tier" setups can still have rate or usage constraints depending on the account.
### Using Google Gemini Flash

NutriScan is configured to use Google Gemini Flash by default. To use Gemini Flash set the following environment variables in your `.env.local` file:

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash
GEMINI_API_URL=optional_custom_endpoint

- The app uses a minimal fetch-based client so no extra SDK is required. `GEMINI_MODEL` lets you change the model if you have access to other Gemini variants.


---

Made with ❤️ by the NutriScan team
