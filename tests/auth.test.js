const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function loadAuthModule() {
  const script = fs.readFileSync(path.resolve(__dirname, '../auth.js'), 'utf8');
  const store = new Map();
  const localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };

  const window = {
    dispatchEvent() {},
    addEventListener() {},
  };

  const context = vm.createContext({
    console,
    window,
    localStorage,
    setTimeout,
    clearTimeout,
    Date,
    TextEncoder,
    crypto: webcrypto,
    CustomEvent: function CustomEvent(type, init = {}) {
      this.type = type;
      this.detail = init.detail || {};
    },
    btoa: (value) => Buffer.from(value, 'utf8').toString('base64'),
    atob: (value) => Buffer.from(value, 'base64').toString('utf8'),
  });

  vm.runInContext(script, context, { filename: 'auth.js' });
  return { GPAuth: context.window.GPAuth, localStorage };
}

test('register rejects invalid email addresses', async () => {
  const { GPAuth } = loadAuthModule();

  await assert.rejects(
    GPAuth.register('Test User', 'not-an-email', 'password123'),
    /valid email/i,
  );
});

test('register rejects disposable email domains', async () => {
  const { GPAuth } = loadAuthModule();

  await assert.rejects(
    GPAuth.register('Test User', 'user@mailinator.com', 'password123'),
    /disposable/i,
  );
});

test('register accepts normal Gmail address and stores encrypted passwords', async () => {
  const { GPAuth, localStorage } = loadAuthModule();

  const user = await GPAuth.register('John Doe', 'john.doe@gmail.com', 'mypassword123');
  assert.equal(user.name, 'John Doe');
  assert.equal(user.email, 'john.doe@gmail.com');

  // Verify that database entry is encrypted and password is secure SHA-256
  const rawDb = localStorage.getItem('gp_users_database');
  assert.ok(rawDb);
  assert.ok(!rawDb.includes('john.doe@gmail.com'), 'Database should be encrypted/obfuscated');
  assert.ok(!rawDb.includes('mypassword123'), 'Plain text password should never be stored');
});

test('login verifies correct credentials and rejects incorrect ones', async () => {
  const { GPAuth } = loadAuthModule();

  await GPAuth.register('Alice Smith', 'alice@gmail.com', 'securepass');
  const user = await GPAuth.login('alice@gmail.com', 'securepass');
  assert.equal(user.name, 'Alice Smith');

  await assert.rejects(
    GPAuth.login('alice@gmail.com', 'wrongpass'),
    /invalid email or password/i
  );
});

test('login enforces rate limiting', async () => {
  const { GPAuth } = loadAuthModule();

  await GPAuth.register('Bob Jones', 'bob@gmail.com', 'bobpassword');

  // Simulate 5 failed login attempts
  for (let i = 0; i < 5; i++) {
    try {
      await GPAuth.login('bob@gmail.com', 'wrongpassword');
    } catch (e) {
      // expected failure
    }
  }

  // The 6th attempt (even with correct password) should fail due to rate limit
  await assert.rejects(
    GPAuth.login('bob@gmail.com', 'bobpassword'),
    /too many attempts/i
  );
});
