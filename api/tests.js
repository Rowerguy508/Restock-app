// API Tests for Poniente
// Run with: npm test

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ ${name}: ${e.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function request(method, path, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
        }
    };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${API_URL}${path}`, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function healthCheck() {
    const { status, data } = await request('GET', '/health');
    assert(status === 200, `Health check failed: ${status}`);
    assert(data.status === 'ok', `Expected ok status, got: ${data.status}`);
}

async function testPlansEndpoint() {
    const { status, data } = await request('GET', '/api/plans');
    assert(status === 200, `Plans endpoint failed: ${status}`);
    assert(Array.isArray(data.plans), 'Plans should be an array');
    assert(data.plans.length >= 3, 'Should have at least 3 plans');
    
    const freePlan = data.plans.find(p => p.id === 'FREE');
    const proPlan = data.plans.find(p => p.id === 'PRO');
    
    assert(freePlan, 'FREE plan should exist');
    assert(proPlan, 'PRO plan should exist');
    assert(freePlan.price_monthly === 0, 'FREE should be $0');
    assert(proPlan.price_monthly === 2900, 'PRO should be $29');
}

async function testSignup() {
    const testOrg = {
        email: `test-${Date.now()}@poniente.app`,
        organizationName: `Test Restaurant ${Date.now()}`,
        plan: 'PRO'
    };
    
    const { status, data } = await request('POST', '/api/signup', testOrg);
    assert(status === 200, `Signup failed: ${status}`);
    assert(data.success === true, 'Signup should return success');
    assert(data.organization.id, 'Should return organization ID');
    assert(data.organization.name === testOrg.organizationName, 'Should return correct name');
}

async function testFeaturesEndpoint() {
    const { status, data } = await request('GET', '/api/features/org_demo/locations');
    assert(status === 200, `Features endpoint failed: ${status}`);
    assert(data.success === true, 'Should return success');
    assert(typeof data.feature.has_access === 'boolean', 'Should have has_access boolean');
}

async function testSubscriptionEndpoint() {
    const { status, data } = await request('GET', '/api/subscription/org_demo');
    assert(status === 200, `Subscription endpoint failed: ${status}`);
    assert(data.success === true, 'Should return success');
    assert(data.subscription.status, 'Should have status');
}

async function testCheckoutEndpoint() {
    const { status, data } = await request('POST', '/api/create-checkout', {
        orgId: 'org_demo',
        planId: 'PRO',
        email: 'test@poniente.app'
    });
    assert(status === 200, `Checkout endpoint failed: ${status}`);
    assert(data.success === true, 'Should return success');
    assert(data.checkoutUrl, 'Should return checkout URL');
}

async function testAnalyticsEndpoint() {
    const { status, data } = await request('POST', '/api/analytics', {
        event: 'test_event',
        data: { test: true }
    });
    assert(status === 200, `Analytics endpoint failed: ${status}`);
    assert(data.success === true, 'Should return success');
}

async function testDebugEndpoint() {
    const { status, data } = await request('GET', '/api/debug');
    assert(status === 200, `Debug endpoint failed: ${status}`);
    assert(typeof data.supabase === 'boolean', 'Should have supabase boolean');
    assert(typeof data.stripe === 'boolean', 'Should have stripe boolean');
}

async function testValidation() {
    // Test missing required fields
    const { status } = await request('POST', '/api/signup', {});
    assert(status === 400, 'Should reject empty signup');
    
    // Test invalid plan
    const result = await request('POST', '/api/create-checkout', {
        orgId: 'org_demo',
        planId: 'INVALID',
        email: 'test@poniente.app'
    });
    assert(result.status === 400, 'Should reject invalid plan');
}

async function runTests() {
    console.log('🧪 Poniente API Tests');
    console.log('====================');
    console.log(`API: ${API_URL}`);
    console.log('');
    
    console.log('Health & Status:');
    await healthCheck();
    await testDebugEndpoint();
    
    console.log('\nPlans & Pricing:');
    await testPlansEndpoint();
    
    console.log('\nUser Management:');
    await testSignup();
    await testFeaturesEndpoint();
    await testSubscriptionEndpoint();
    
    console.log('\nPayments:');
    await testCheckoutEndpoint();
    
    console.log('\nAnalytics:');
    await testAnalyticsEndpoint();
    
    console.log('\nValidation:');
    await testValidation();
    
    console.log('\n====================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('');
    
    if (failed > 0) {
        console.log('❌ Some tests failed');
        process.exit(1);
    } else {
        console.log('✅ All tests passed!');
        process.exit(0);
    }
}

runTests().catch(e => {
    console.error('Test runner error:', e);
    process.exit(1);
});
