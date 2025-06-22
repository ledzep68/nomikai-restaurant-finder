import dotenv from 'dotenv';

dotenv.config();

interface Config {
  app: {
    port: number;
    nodeEnv: string;
  };
  database: {
    type: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    path?: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  cors: {
    allowedOrigins: string[];
  };
  externalApis: {
    tabelog: {
      endpoint: string;
      apiKey: string;
      rateLimit: number;
      timeout: number;
    };
    hotpepper: {
      endpoint: string;
      apiKey: string;
      rateLimit: number;
      timeout: number;
    };
    googlePlaces: {
      endpoint: string;
      apiKey: string;
      rateLimit: number;
      timeout: number;
    };
    retty: {
      endpoint: string;
      apiKey: string;
      rateLimit: number;
      timeout: number;
    };
  };
}

const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
};

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required and not set`);
  }
  return value;
};

export const config: Config = {
  app: {
    port: parseInt(getEnvVar('PORT', '3000'), 10),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
  },
  database: {
    type: getRequiredEnvVar('DB_TYPE'),
    host: getRequiredEnvVar('DB_HOST'),
    port: parseInt(getRequiredEnvVar('DB_PORT'), 10),
    name: getRequiredEnvVar('DB_NAME'),
    user: getRequiredEnvVar('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    path: getRequiredEnvVar('DB_PATH'),
  },
  redis: {
    url: getRequiredEnvVar('REDIS_URL'),
  },
  jwt: {
    secret: getRequiredEnvVar('JWT_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  },
  rateLimit: {
    windowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    max: parseInt(getEnvVar('RATE_LIMIT_MAX', '100'), 10),
  },
  cors: {
    allowedOrigins: getRequiredEnvVar('ALLOWED_ORIGINS').split(','),
  },
  externalApis: {
    tabelog: {
      endpoint: getEnvVar('TABELOG_API_ENDPOINT', 'https://api.tabelog.com/v1'),
      apiKey: process.env.TABELOG_API_KEY || '',
      rateLimit: parseInt(getEnvVar('TABELOG_RATE_LIMIT', '60'), 10),
      timeout: parseInt(getEnvVar('TABELOG_TIMEOUT', '10000'), 10),
    },
    hotpepper: {
      endpoint: getEnvVar('HOTPEPPER_API_ENDPOINT', 'https://webservice.recruit.co.jp/hotpepper'),
      apiKey: process.env.HOTPEPPER_API_KEY || '',
      rateLimit: parseInt(getEnvVar('HOTPEPPER_RATE_LIMIT', '100'), 10),
      timeout: parseInt(getEnvVar('HOTPEPPER_TIMEOUT', '10000'), 10),
    },
    googlePlaces: {
      endpoint: getEnvVar('GOOGLE_PLACES_API_ENDPOINT', 'https://maps.googleapis.com/maps/api/place'),
      apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
      rateLimit: parseInt(getEnvVar('GOOGLE_PLACES_RATE_LIMIT', '100'), 10),
      timeout: parseInt(getEnvVar('GOOGLE_PLACES_TIMEOUT', '10000'), 10),
    },
    retty: {
      endpoint: getEnvVar('RETTY_API_ENDPOINT', 'https://api.retty.me/v1'),
      apiKey: process.env.RETTY_API_KEY || '',
      rateLimit: parseInt(getEnvVar('RETTY_RATE_LIMIT', '60'), 10),
      timeout: parseInt(getEnvVar('RETTY_TIMEOUT', '10000'), 10),
    },
  },
};