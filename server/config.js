import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the path to the .env file (one level up from server folder)
const envPath = resolve(__dirname, '..', '.env');

// Only load from .env file in development
if (process.env.NODE_ENV !== 'production') {
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.warn(`.env file not found at: ${envPath}. Make sure environment variables are set in production.`);
  } else {
    // Load environment variables from .env file
    dotenv.config({ path: envPath });
  }
}

// Server configuration
const serverConfig = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    apiVersion: '2023-10-16'
  },
  port: process.env.PORT || 3000
};

// Validate required configuration
if (!serverConfig.stripe.secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export default serverConfig; 