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

export const config: Config = {
  app: {
    port: parseInt(getEnvVar('PORT', '3000'), 10),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
  },
  database: {
    type: getEnvVar('DB_TYPE', 'sqlite'),
    host: getEnvVar('DB_HOST', 'localhost'),
    port: parseInt(getEnvVar('DB_PORT', '5432'), 10),
    name: getEnvVar('DB_NAME', 'nomikai_restaurant_finder'),
    user: getEnvVar('DB_USER', 'postgres'),
    password: getEnvVar('DB_PASSWORD', 'password'),
    path: getEnvVar('DB_PATH', './database/nomikai.db'),
  },
  redis: {
    url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  },
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  },
  rateLimit: {
    windowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    max: parseInt(getEnvVar('RATE_LIMIT_MAX', '100'), 10),
  },
  cors: {
    allowedOrigins: getEnvVar('ALLOWED_ORIGINS', 'http://localhost:3000').split(','),
  },
  externalApis: {
    tabelog: {
      endpoint: getEnvVar('TABELOG_API_ENDPOINT', 'https://api.tabelog.com/v1'),
      apiKey: getEnvVar('TABELOG_API_KEY', ''),
      rateLimit: parseInt(getEnvVar('TABELOG_RATE_LIMIT', '60'), 10),
      timeout: parseInt(getEnvVar('TABELOG_TIMEOUT', '10000'), 10),
    },
    hotpepper: {
      endpoint: getEnvVar('HOTPEPPER_API_ENDPOINT', 'https://webservice.recruit.co.jp/hotpepper'),
      apiKey: getEnvVar('HOTPEPPER_API_KEY', ''),
      rateLimit: parseInt(getEnvVar('HOTPEPPER_RATE_LIMIT', '100'), 10),
      timeout: parseInt(getEnvVar('HOTPEPPER_TIMEOUT', '10000'), 10),
    },
    googlePlaces: {
      endpoint: getEnvVar('GOOGLE_PLACES_API_ENDPOINT', 'https://maps.googleapis.com/maps/api/place'),
      apiKey: getEnvVar('GOOGLE_PLACES_API_KEY', ''),
      rateLimit: parseInt(getEnvVar('GOOGLE_PLACES_RATE_LIMIT', '100'), 10),
      timeout: parseInt(getEnvVar('GOOGLE_PLACES_TIMEOUT', '10000'), 10),
    },
    retty: {
      endpoint: getEnvVar('RETTY_API_ENDPOINT', 'https://api.retty.me/v1'),
      apiKey: getEnvVar('RETTY_API_KEY', ''),
      rateLimit: parseInt(getEnvVar('RETTY_RATE_LIMIT', '60'), 10),
      timeout: parseInt(getEnvVar('RETTY_TIMEOUT', '10000'), 10),
    },
  },
};