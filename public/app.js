const loginBox = document.getElementById('login-box');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const headerActions = document.getElementById('header-actions');
const headerUser = document.getElementById('header-user');
const screenTitle = document.getElementById('screen-title');
const notFoundView = document.getElementById('not-found-view');
const yellowNotice = document.getElementById('yellow-notice');
const appFooter = document.getElementById('app-footer');
const roleLabels = {
  writer: '작성자',
  reviewer: '검토자',
  'factory-user': '품질관리',
};
let loginAttemptStarted = false;

function showApp(user) {
  loginBox.hidden = true;
  appScreen.hidden = false;
  headerActions.hidden = false;
  yellowNotice.hidden = false;
  appFooter.hidden = false;
  headerUser.textContent = `${user.username} (${roleLabels[user.role] || user.role})`;

  showScreenForCurrentAddress();
}

function showScreenForCurrentAddress() {
  const route = window.location.pathname;
  let title;

  if (route === '/') title = '품질 현황';
  else if (route === '/inspections/new') title = '검사 등록';
  else if (/^\/inspections\/[^/]+$/.test(route)) title = '검사 상세';
  else if (route === '/settings') title = '설정';

  screenTitle.textContent = title || '';
  screenTitle.hidden = !title;
  notFoundView.hidden = Boolean(title);
}

function navigateTo(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  showScreenForCurrentAddress();
}

function showError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

async function checkLogin() {
  try {
    const response = await fetch('/api/session');
    const result = await response.json();
    if (loginAttemptStarted) return;
    if (!response.ok) {
      throw new Error(result.error || '로그인 상태를 확인하지 못했습니다.');
    }

    if (result.user) {
      console.info('로그인 상태 확인: 로그인됨', result.user.username);
      showApp(result.user);
    } else {
      console.info('로그인 상태 확인: 로그인되지 않음');
      headerActions.hidden = true;
      yellowNotice.hidden = true;
      appFooter.hidden = true;
      appScreen.hidden = true;
      loginBox.hidden = false;
    }
  } catch (error) {
    console.error('로그인 상태 확인 실패:', error);
    headerActions.hidden = true;
    yellowNotice.hidden = true;
    appFooter.hidden = true;
    appScreen.hidden = true;
    loginBox.hidden = false;
    showError(error.message || '로그인 상태를 확인하지 못했습니다.');
  }
}

if (loginForm && loginButton) loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginAttemptStarted = true;
  loginError.hidden = true;
  loginButton.disabled = true;

  const formData = new FormData(loginForm);
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password'),
      }),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      showError(result.error || '로그인 정보를 확인하세요.');
      return;
    }
    showApp(result.user);
  } catch (error) {
    showError(error.message || '서버와 통신할 수 없습니다.');
  } finally {
    loginButton.disabled = false;
  }
});

if (logoutButton) logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    const response = await fetch('/api/logout', { method: 'POST' });
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || '로그아웃하지 못했습니다.');
    }

    loginForm.reset();
    loginError.textContent = '';
    loginError.hidden = true;
    headerUser.textContent = '';
    headerActions.hidden = true;
    yellowNotice.hidden = true;
    appFooter.hidden = true;
    appScreen.hidden = true;
    loginBox.hidden = false;
  } catch (error) {
    showError(error.message || '로그아웃하지 못했습니다.');
  } finally {
    logoutButton.disabled = false;
  }
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest('a[data-link]');
  if (
    !link ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    link.target === '_blank'
  ) {
    return;
  }

  const destination = new URL(link.href, window.location.href);
  if (destination.origin !== window.location.origin) return;

  event.preventDefault();
  navigateTo(`${destination.pathname}${destination.search}${destination.hash}`);
});

window.addEventListener('popstate', showScreenForCurrentAddress);

void checkLogin();