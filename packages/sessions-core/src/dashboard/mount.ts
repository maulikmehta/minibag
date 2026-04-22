/**
 * Dashboard Mounting Function
 * Allows products to mount the monitoring dashboard as middleware
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDashboardMetrics } from './monitor.js';
import { validateDatabaseConfig, checkDatabaseConnection } from '../validation/database.js';
import { checkSchemaCompatibility } from '../validation/schema-checker.js';
import { getDatabaseClient } from '../database/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DashboardConfig {
  /** Mount path for dashboard (default: '/sessions-monitor') */
  path?: string;

  /** Authentication configuration */
  auth?: {
    type: 'basic' | 'token' | 'custom';
    credentials?: {
      username: string;
      password: string;
    };
    validateToken?: (token: string) => Promise<boolean>;
  };

  /** Product branding */
  branding?: {
    productName?: string;
    logo?: string;
    primaryColor?: string;
    favicon?: string;
  };

  /** Refresh interval in milliseconds (default: 5000) */
  refreshInterval?: number;

  /** Custom session fields to display */
  customFields?: Array<{
    key: string;
    label: string;
  }>;
}

/**
 * Basic authentication middleware
 */
function createBasicAuthMiddleware(credentials: { username: string; password: string }) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Sessions Dashboard"');
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }

    const base64Credentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = decodedCredentials.split(':');

    if (username === credentials.username && password === credentials.password) {
      next();
    } else {
      res.setHeader('WWW-Authenticate', 'Basic realm="Sessions Dashboard"');
      res.statusCode = 401;
      res.end('Unauthorized');
    }
  };
}

/**
 * Mount dashboard to an Express-like server
 */
export async function mountDashboard(server: any, config: DashboardConfig = {}) {
  const {
    path = '/sessions-monitor',
    auth,
    branding = {},
    refreshInterval = 5000,
  } = config;

  console.log('\n🚀 Mounting Sessions SDK Dashboard...\n');

  // ✅ Step 1: Validate database configuration
  try {
    const dbConfig = validateDatabaseConfig();
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  } catch (error) {
    console.error('\n' + (error as Error).message);
    throw new Error('Database configuration validation failed. Cannot mount dashboard.');
  }

  // ✅ Step 2: Check database connection
  try {
    const prisma = getDatabaseClient();
    await checkDatabaseConnection(prisma);
    console.log(`   Connection: ✅ Connected`);
  } catch (error) {
    console.error('\n' + (error as Error).message);
    throw new Error('Database connection failed. Cannot mount dashboard.');
  }

  // ✅ Step 3: Validate schema compatibility
  try {
    const schemaCheck = await checkSchemaCompatibility();
    if (!schemaCheck.compatible) {
      throw new Error(
        'Schema compatibility check failed!\n' +
        schemaCheck.errors.join('\n')
      );
    }
    console.log(`   Schema: ✅ Compatible\n`);
  } catch (error) {
    console.error('\n' + (error as Error).message);
    throw new Error('Schema validation failed. Cannot mount dashboard.');
  }

  // Create authentication middleware if configured
  let authMiddleware: any = null;
  if (auth) {
    if (auth.type === 'basic' && auth.credentials) {
      authMiddleware = createBasicAuthMiddleware(auth.credentials);
    }
    // TODO: Add token and custom auth support
  }

  // Serve dashboard UI
  server.get(path, (req: any, res: any) => {
    // Apply auth if configured
    if (authMiddleware) {
      return authMiddleware(req, res, () => {
        serveDashboardHTML(res, branding, refreshInterval);
      });
    }
    serveDashboardHTML(res, branding, refreshInterval);
  });

  // Serve dashboard API endpoint
  server.get(`${path}/api/monitor`, async (req: any, res: any) => {
    // Apply auth if configured
    if (authMiddleware) {
      return authMiddleware(req, res, async () => {
        await serveDashboardAPI(res, branding);
      });
    }
    await serveDashboardAPI(res, branding);
  });

  console.log(`✅ Sessions Dashboard successfully mounted at: ${path}\n`);
}

/**
 * Serve dashboard HTML with branding customization
 */
function serveDashboardHTML(res: any, branding: DashboardConfig['branding'], refreshInterval: number) {
  try {
    let html = readFileSync(join(__dirname, 'ui.html'), 'utf-8');

    // Inject branding
    if (branding?.productName) {
      html = html.replace('<title>Sessions Monitor</title>', `<title>${branding.productName} - Monitor</title>`);
      html = html.replace('Sessions Monitor', branding.productName);
    }

    if (branding?.primaryColor) {
      html = html.replace(
        '</style>',
        `
        .metric-value { color: ${branding.primaryColor} !important; }
        .milestone-dot.active { background: ${branding.primaryColor} !important; }
        </style>
        `
      );
    }

    // Update API endpoint to use mounted path
    html = html.replace(
      "const API_ENDPOINT = '/api/dashboard/monitor';",
      `const API_ENDPOINT = window.location.pathname + '/api/monitor';`
    );

    // Update refresh interval
    html = html.replace(
      'const REFRESH_INTERVAL = 5000;',
      `const REFRESH_INTERVAL = ${refreshInterval};`
    );

    res.setHeader('Content-Type', 'text/html');
    res.statusCode = 200;
    res.end(html);
  } catch (error) {
    console.error('Error serving dashboard HTML:', error);
    res.statusCode = 500;
    res.end('Error loading dashboard');
  }
}

/**
 * Serve dashboard API data
 */
async function serveDashboardAPI(res: any, branding: DashboardConfig['branding']) {
  try {
    const metrics = await getDashboardMetrics();

    // Include branding info in response
    const response = {
      ...metrics,
      branding: {
        productName: branding?.productName || 'Sessions SDK'
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch metrics' }));
  }
}
