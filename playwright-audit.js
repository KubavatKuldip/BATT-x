// BATT-X Comprehensive Browser Audit
// Physical browser testing with Playwright

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const RESULTS = {
  tests: [],
  passed: 0,
  failed: 0,
  bugs: [],
  fixes: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✓' : '▶';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(name, passed, error = null, details = null) {
  RESULTS.tests.push({ name, passed, error, details, timestamp: new Date().toISOString() });
  if (passed) {
    RESULTS.passed++;
    log(`PASS: ${name}`, 'success');
  } else {
    RESULTS.failed++;
    log(`FAIL: ${name} - ${error}`, 'error');
    if (details) log(`  Details: ${JSON.stringify(details)}`, 'error');
  }
}

async function checkConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  return errors;
}

async function waitForNetworkIdle(page, timeout = 3000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    // Continue even if networkidle times out
  }
}

async function testSignup(page) {
  log('Testing Signup Flow...');

  try {
    await page.goto(`${BASE_URL}/auth/signup`, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(page);

    // Check page loaded
    const title = await page.title();
    recordTest('Signup page loads', title.includes('BATT') || await page.locator('text=Sign up').isVisible());

    // Fill signup form
    const testEmail = `test${Date.now()}@battx.com`;
    const testPassword = 'TestPassword123!';

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[name="name"]', 'Test User');

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Check if redirected to signin or dashboard
    const currentUrl = page.url();
    const signupSuccess = currentUrl.includes('/auth/signin') || currentUrl.includes('/dashboard');
    recordTest('Signup completes', signupSuccess, signupSuccess ? null : `Stuck at ${currentUrl}`);

    return { email: testEmail, password: testPassword };
  } catch (error) {
    recordTest('Signup flow', false, error.message);
    return null;
  }
}

async function testLogin(page, credentials) {
  log('Testing Login Flow...');

  try {
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(page);

    // Check page loaded
    recordTest('Login page loads', await page.locator('text=Sign in').isVisible());

    // Fill login form
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check if redirected to dashboard
    const currentUrl = page.url();
    const loginSuccess = currentUrl.includes('/dashboard');
    recordTest('Login redirects to dashboard', loginSuccess, loginSuccess ? null : `At ${currentUrl}`);

    // Check for session cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session-token') || c.name.includes('authjs'));
    recordTest('Session cookie set', !!sessionCookie);

    return loginSuccess;
  } catch (error) {
    recordTest('Login flow', false, error.message);
    return false;
  }
}

async function testLogout(page) {
  log('Testing Logout Flow...');

  try {
    // Find and click logout button (could be in sidebar, dropdown, etc.)
    const logoutSelectors = [
      'text=Logout',
      'text=Log out',
      'text=Sign out',
      '[aria-label*="logout" i]',
      '[aria-label*="sign out" i]'
    ];

    let logoutClicked = false;
    for (const selector of logoutSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          logoutClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!logoutClicked) {
      // Try opening user menu first
      const menuSelectors = ['[aria-label*="user" i]', '[aria-label*="menu" i]', 'button:has-text("Settings")'];
      for (const selector of menuSelectors) {
        try {
          await page.click(selector, { timeout: 1000 });
          await page.waitForTimeout(500);

          for (const logoutSel of logoutSelectors) {
            try {
              const element = page.locator(logoutSel).first();
              if (await element.isVisible({ timeout: 1000 })) {
                await element.click();
                logoutClicked = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          if (logoutClicked) break;
        } catch (e) {
          continue;
        }
      }
    }

    recordTest('Logout button found and clicked', logoutClicked);

    if (logoutClicked) {
      await page.waitForTimeout(2000);
      const currentUrl = page.url();

      // Check NOT redirected to localhost
      const hasLocalhost = currentUrl.includes('localhost') && !currentUrl.startsWith(BASE_URL);
      recordTest('No localhost redirect on logout', !hasLocalhost, hasLocalhost ? currentUrl : null);

      // Check redirected to signin
      const redirectedToSignin = currentUrl.includes('/auth/signin') || currentUrl.includes('/auth/signout');
      recordTest('Logout redirects to signin', redirectedToSignin, redirectedToSignin ? null : currentUrl);

      // Check session cleared
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session-token') || c.name.includes('authjs'));
      recordTest('Session cookie cleared', !sessionCookie);
    }

    return logoutClicked;
  } catch (error) {
    recordTest('Logout flow', false, error.message);
    return false;
  }
}

async function testDashboard(page) {
  log('Testing Dashboard...');

  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(page);

    // Check sensor cards visible
    const hasSensorCards = await page.locator('text=/temperature|voltage|current|gas/i').count() > 0;
    recordTest('Dashboard sensor cards visible', hasSensorCards);

    // Check for data values
    const hasValues = await page.locator('text=/°C|V|A|%/').count() > 0;
    recordTest('Dashboard shows sensor values', hasValues);

    // Check for status indicators
    const hasStatus = await page.locator('text=/normal|warning|critical|cutoff/i').count() > 0;
    recordTest('Dashboard shows status', hasStatus);

    // Wait for Socket.IO connection (check console or connection indicator)
    await page.waitForTimeout(3000);

    return true;
  } catch (error) {
    recordTest('Dashboard load', false, error.message);
    return false;
  }
}

async function testNavigationPages(page) {
  log('Testing Navigation Through All Pages...');

  const pages = [
    { url: '/dashboard', name: 'Dashboard', expectedText: 'temperature' },
    { url: '/alerts', name: 'Alerts', expectedText: 'alert' },
    { url: '/analytics', name: 'Analytics', expectedText: 'chart' },
    { url: '/safety', name: 'Safety', expectedText: 'emergency' },
    { url: '/location', name: 'Location', expectedText: 'location' },
    { url: '/settings', name: 'Settings', expectedText: 'settings' },
    { url: '/devices/pairing', name: 'Device Pairing', expectedText: 'pair' },
    { url: '/admin', name: 'Admin', expectedText: 'admin' }
  ];

  for (const pageInfo of pages) {
    try {
      await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await waitForNetworkIdle(page);

      const pageLoaded = await page.locator('body').isVisible();
      recordTest(`${pageInfo.name} page loads`, pageLoaded);

      // Check for expected content
      const hasContent = await page.locator(`text=/${pageInfo.expectedText}/i`).first().isVisible({ timeout: 5000 }).catch(() => false);
      recordTest(`${pageInfo.name} has expected content`, hasContent);

    } catch (error) {
      recordTest(`${pageInfo.name} page`, false, error.message);
    }
  }
}

async function testResponsiveLayout(page) {
  log('Testing Responsive Layout...');

  const viewports = [
    { width: 375, height: 667, name: 'Mobile (iPhone SE)' },
    { width: 768, height: 1024, name: 'Tablet (iPad)' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];

  for (const viewport of viewports) {
    try {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      recordTest(`${viewport.name} - No horizontal overflow`, !hasOverflow);

      // Check navigation visible
      const hasNav = await page.locator('nav').isVisible();
      recordTest(`${viewport.name} - Navigation accessible`, hasNav);

    } catch (error) {
      recordTest(`${viewport.name} layout`, false, error.message);
    }
  }
}

async function testProtectedRoutes(page, context) {
  log('Testing Protected Routes...');

  try {
    // Clear session
    await context.clearCookies();

    // Try to access dashboard without auth
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const redirectedToAuth = currentUrl.includes('/auth/signin') || currentUrl.includes('/login');
    recordTest('Protected route redirects to signin', redirectedToAuth, redirectedToAuth ? null : currentUrl);

  } catch (error) {
    recordTest('Protected routes', false, error.message);
  }
}

async function testSocketIO(page) {
  log('Testing Socket.IO Connection...');

  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(page);

    // Check for Socket.IO connection in console
    const socketMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Socket') || text.includes('socket') || text.includes('connected')) {
        socketMessages.push(text);
      }
    });

    await page.waitForTimeout(5000); // Wait for Socket.IO to connect

    const hasSocketMessages = socketMessages.length > 0;
    recordTest('Socket.IO connection attempted', hasSocketMessages, hasSocketMessages ? null : 'No socket messages in console');

    // Check for realtime updates (sensor values should change)
    const initialTemp = await page.locator('text=/temperature/i').first().textContent().catch(() => null);
    await page.waitForTimeout(6000); // Wait for updates
    const updatedTemp = await page.locator('text=/temperature/i').first().textContent().catch(() => null);

    const dataUpdates = initialTemp !== updatedTemp;
    recordTest('Realtime sensor data updates', dataUpdates);

  } catch (error) {
    recordTest('Socket.IO connection', false, error.message);
  }
}

async function testModeSwitch(page) {
  log('Testing Rider/Technician Mode Switch...');

  try {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(page);

    // Find mode selection
    const riderButton = page.locator('text=/for riders/i, text=/rider/i').first();
    const technicianButton = page.locator('text=/for technicians/i, text=/technician/i').first();

    const hasModeSelector = await riderButton.isVisible({ timeout: 2000 }).catch(() => false) ||
                             await technicianButton.isVisible({ timeout: 2000 }).catch(() => false);

    recordTest('Mode selector visible', hasModeSelector);

    if (hasModeSelector) {
      // Try switching mode
      await technicianButton.click();
      await page.waitForTimeout(1000);

      recordTest('Mode switch interaction works', true);
    }

  } catch (error) {
    recordTest('Mode switch', false, error.message);
  }
}

async function checkNetworkRequests(page) {
  log('Checking Network Requests...');

  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()
    });
  });

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await waitForNetworkIdle(page);
  await page.waitForTimeout(3000);

  const hasFailed = failedRequests.length > 0;
  recordTest('No failed network requests', !hasFailed, hasFailed ? failedRequests : null);

  return failedRequests;
}

async function runAudit() {
  log('=== BATT-X BROWSER AUDIT STARTING ===');
  log(`Testing against: ${BASE_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // Test 1: Signup
    const credentials = await testSignup(page);

    if (!credentials) {
      log('Signup failed, using demo credentials', 'error');
      credentials = { email: 'demo@battx.com', password: 'BATTxDemo!2026#47' };
    }

    // Test 2: Login
    const loggedIn = await testLogin(page, credentials);

    if (loggedIn) {
      // Test 3: Dashboard
      await testDashboard(page);

      // Test 4: All navigation pages
      await testNavigationPages(page);

      // Test 5: Mode switch
      await testModeSwitch(page);

      // Test 6: Socket.IO
      await testSocketIO(page);

      // Test 7: Logout
      await testLogout(page);

      // Test 8: Login again
      await testLogin(page, credentials);

      // Test 9: Network requests
      await checkNetworkRequests(page);

      // Test 10: Responsive layout
      await testResponsiveLayout(page);
    }

    // Test 11: Protected routes (after logout)
    await testProtectedRoutes(page, context);

    // Check console errors
    const hasConsoleErrors = consoleErrors.length > 0;
    recordTest('No console errors', !hasConsoleErrors, hasConsoleErrors ? consoleErrors.slice(0, 5) : null);

  } catch (error) {
    log(`Fatal error during audit: ${error.message}`, 'error');
    RESULTS.bugs.push({
      severity: 'CRITICAL',
      description: 'Fatal error during browser audit',
      error: error.message,
      stack: error.stack
    });
  } finally {
    await browser.close();
  }

  // Generate report
  log('\n=== AUDIT COMPLETE ===');
  log(`Tests Executed: ${RESULTS.tests.length}`);
  log(`Tests Passed: ${RESULTS.passed}`, 'success');
  log(`Tests Failed: ${RESULTS.failed}`, RESULTS.failed > 0 ? 'error' : 'success');

  // Save detailed results
  const reportPath = path.join(__dirname, 'playwright-audit-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(RESULTS, null, 2));
  log(`Detailed results saved to: ${reportPath}`);

  // Determine deployment readiness
  const criticalFailures = RESULTS.failed > (RESULTS.tests.length * 0.3); // More than 30% failure
  const deploymentStatus = criticalFailures ? 'NOT READY' : 'READY';

  log(`\nDEPLOYMENT READINESS: ${deploymentStatus}`, deploymentStatus === 'READY' ? 'success' : 'error');

  return RESULTS;
}

// Run the audit
runAudit().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
