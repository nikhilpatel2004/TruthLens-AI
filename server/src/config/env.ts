import dotenv from 'dotenv';
dotenv.config();

export function getCleanKieBaseUrl(): string {
  const raw = process.env.KIE_BASE_URL || 'https://api.kie.ai';
  // If the user's environment set KIE_BASE_URL to the Cloudflare R2 worker, route to official chat API domain
  if (raw.includes('redpandaai') || !raw.startsWith('http')) {
    return 'https://api.kie.ai';
  }
  return raw.replace(/\/+$/, '');
}

export function getCleanKieModel(): string {
  const raw = process.env.KIE_MODEL || 'gemini-3-8-flash-openai';
  // Ensure we use a valid text LLM model if an image/video model alias was set
  if (
    raw.toLowerCase().includes('seedance') ||
    raw.toLowerCase().includes('flux') ||
    raw.toLowerCase().includes('recraft')
  ) {
    return 'gemini-3-8-flash-openai';
  }
  return raw;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  kie: {
    get apiKey() {
      return process.env.KIE_API_KEY || '';
    },
    get baseUrl() {
      return getCleanKieBaseUrl();
    },
    get model() {
      return getCleanKieModel();
    },
  },
  research: {
    get tavilyApiKey() {
      return process.env.TAVILY_API_KEY || '';
    },
    get googleFactCheckApiKey() {
      return process.env.GOOGLE_FACT_CHECK_API_KEY || '';
    },
  },
  supabase: {
    get url() {
      return process.env.SUPABASE_URL || '';
    },
    get serviceRoleKey() {
      return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    },
  },
};

export function validateConfig() {
  const issues: string[] = [];
  if (!config.kie.apiKey) {
    issues.push('KIE_API_KEY is not configured in environment.');
  }
  return {
    valid: issues.length === 0,
    issues,
  };
}
