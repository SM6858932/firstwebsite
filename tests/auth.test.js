const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
