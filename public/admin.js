let rootElement;
let activeSection = 'dashboard';
let currentStatus = 'all';
let currentQuery = '';
const LANG_KEY = 'burn0_lang';
const ADMIN_UNLOCK_KEY = 'burn0_admin_unlocked';
const ADMIN_USERNAME_KEY = 'burn0_admin_username';
let language = localStorage.getItem(LANG_KEY) || 'zh';
const ADMIN_COPY = {
  zh: {
    nav: {
      dashboard: '总览',
      messages: '消息',
      reports: '举报',
      blocked: '封禁',
      settings: '设置'
    },
    adminNav: '管理',
    adminEyebrow: '管理',
    checkingAccess: '正在检查权限...',
    dashboardTitle: '总览',
    dashboardCopy: 'Burn0 运行状态。',
    metrics: {
      total: '总消息',
      active: '可访问',
      burned: '已归零',
      expired: '已过期',
      quarantined: '已隔离',
      deleted: '已删除',
      openReports: '待审核举报',
      blockedSources: '封禁来源',
      recentMessages: '24 小时创建',
      recentReports: '24 小时举报'
    },
    messagesTitle: '消息',
    messagesCopy: '正文、状态和来源信号。',
    statuses: {
      all: '全部',
      active: '可访问',
      burned: '已归零',
      expired: '已过期',
      quarantined: '已隔离',
      deleted: '已删除',
      reported: '有举报',
      open: '待审核',
      confirmed: '已确认',
      resolved: '已确认',
      rejected: '已驳回',
      lifted: '已解除'
    },
    searchPlaceholder: '搜索正文',
    refresh: '刷新',
    selectAll: '全选',
    deleteSelected: '删除所选',
    loadingMessages: '正在加载消息...',
    noMessages: '没有匹配的消息。',
    headers: {
      status: '状态',
      summary: '摘要',
      views: '查看',
      created: '创建',
      expires: '过期',
      reports: '举报',
      source: '来源',
      action: '操作',
      message: '消息',
      reason: '原因',
      type: '类型',
      admin: '管理员',
      target: '目标',
      time: '时间'
    },
    view: '查看',
    close: '关闭',
    reportsTitle: '举报',
    reportsCopy: '访问者提交的举报记录。',
    noReports: '暂无举报。',
    reportReasons: {
      illegal: '违法内容',
      abuse: '滥用',
      spam: '垃圾内容',
      harassment: '骚扰',
      other: '其他'
    },
    confirmReport: '确认',
    rejectReport: '驳回',
    blockedTitle: '封禁来源',
    blockedCopy: '阻止指定来源继续创建消息。',
    block: '封禁',
    noBlocked: '暂无封禁来源。',
    lift: '解除',
    settingsTitle: '设置',
    settingsCopy: '清理策略和运行状态。',
    cleanupTitle: '消息清理',
    cleanupEnabled: '自动清理',
    cleanupIntervalHours: '执行间隔（小时）',
    cleanupRetentionDays: '保留天数',
    cleanupLastRun: '上次运行',
    cleanupPurgeable: '可清理消息',
    cleanupCutoff: '清理截止',
    cleanupNever: '尚未运行',
    saveSettings: '保存设置',
    purgeNow: '立即清理',
    settingsSaved: '设置已保存。',
    purgeResult: (result) => `已清理 ${result.messages} 条消息、${result.reports} 条举报、${result.events} 条事件。${result.hasMore ? '仍有更多可清理数据。' : ''}`,
    blockForm: {
      ip: 'IP',
      userAgent: 'User-Agent',
      value: 'IP 或 User-Agent'
    },
    messageTitle: '消息',
    quarantine: '隔离',
    delete: '删除',
    ban: '封禁来源',
    fields: {
      mode: '归零方式',
      views: '查看次数',
      created: '创建时间',
      expires: '过期时间',
      opened: '打开时间',
      burned: '归零时间',
      reports: '举报数',
      ip: 'IP',
      userAgent: 'User-Agent',
      quarantine: '隔离原因',
      delete: '删除原因'
    },
    events: '事件',
    none: '无',
    userPage: '用户页',
    adminAccessTitle: '需要管理权限',
    adminAccessCopy: '请使用环境变量中的账号密码登录。',
    langToggle: 'EN',
    promptBlock: '请输入封禁原因',
    promptLift: '请输入解除封禁原因',
    promptAction: (action) => `请输入${action}原因`,
    promptConfirmReport: '请输入确认说明',
    promptRejectReport: '请输入驳回说明',
    promptDeleteOptional: '删除说明（可选）',
    modalCancel: '取消',
    modalSubmit: '确认',
    loginTitle: '管理登录',
    loginCopy: '请确认身份后进入管理台。',
    loginUsername: '管理员账号',
    loginUsernamePlaceholder: '输入账号',
    loginPassword: '管理员密码',
    loginPasswordPlaceholder: '输入密码',
    loginButton: '进入管理台',
    loginChecking: '验证中...',
    loginNote: '',
    loginError: '登录失败'
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      messages: 'Messages',
      reports: 'Reports',
      blocked: 'Blocked',
      settings: 'Settings'
    },
    adminNav: 'Admin navigation',
    adminEyebrow: 'Admin',
    checkingAccess: 'Checking access...',
    dashboardTitle: 'Dashboard',
    dashboardCopy: 'Burn0 operating status.',
    metrics: {
      total: 'Total messages',
      active: 'Active',
      burned: 'Zeroed',
      expired: 'Expired',
      quarantined: 'Quarantined',
      deleted: 'Deleted',
      openReports: 'Open reports',
      blockedSources: 'Blocked sources',
      recentMessages: 'Created in 24h',
      recentReports: 'Reports in 24h'
    },
    messagesTitle: 'Messages',
    messagesCopy: 'Text, status, and source signals.',
    statuses: {
      all: 'All',
      active: 'Active',
      burned: 'Zeroed',
      expired: 'Expired',
      quarantined: 'Quarantined',
      deleted: 'Deleted',
      reported: 'Reported',
      open: 'Open',
      confirmed: 'Confirmed',
      resolved: 'Confirmed',
      rejected: 'Rejected',
      lifted: 'Lifted'
    },
    searchPlaceholder: 'Search text',
    refresh: 'Refresh',
    selectAll: 'Select all',
    deleteSelected: 'Delete selected',
    loadingMessages: 'Loading messages...',
    noMessages: 'No messages match the current filters.',
    headers: {
      status: 'Status',
      summary: 'Summary',
      views: 'Views',
      created: 'Created',
      expires: 'Expires',
      reports: 'Reports',
      source: 'Source',
      action: 'Action',
      message: 'Message',
      reason: 'Reason',
      type: 'Type',
      admin: 'Admin',
      target: 'Target',
      time: 'Time'
    },
    view: 'View',
    close: 'Close',
    reportsTitle: 'Reports',
    reportsCopy: 'Reports submitted by visitors.',
    noReports: 'No reports.',
    reportReasons: {
      illegal: 'Illegal content',
      abuse: 'Abuse',
      spam: 'Spam',
      harassment: 'Harassment',
      other: 'Other'
    },
    confirmReport: 'Confirm',
    rejectReport: 'Reject',
    blockedTitle: 'Blocked sources',
    blockedCopy: 'Block selected sources from creating messages.',
    block: 'Block',
    noBlocked: 'No blocked sources.',
    lift: 'Lift',
    settingsTitle: 'Settings',
    settingsCopy: 'Cleanup policy and run state.',
    cleanupTitle: 'Message cleanup',
    cleanupEnabled: 'Automatic cleanup',
    cleanupIntervalHours: 'Interval hours',
    cleanupRetentionDays: 'Retention days',
    cleanupLastRun: 'Last run',
    cleanupPurgeable: 'Purgeable messages',
    cleanupCutoff: 'Cleanup cutoff',
    cleanupNever: 'Never',
    saveSettings: 'Save settings',
    purgeNow: 'Purge now',
    settingsSaved: 'Settings saved.',
    purgeResult: (result) => `Purged ${result.messages} messages, ${result.reports} reports, and ${result.events} events.${result.hasMore ? ' More purgeable data remains.' : ''}`,
    blockForm: {
      ip: 'IP',
      userAgent: 'User-Agent',
      value: 'IP or User-Agent'
    },
    messageTitle: 'Message',
    quarantine: 'Quarantine',
    delete: 'Delete',
    ban: 'Ban source',
    fields: {
      mode: 'Zero mode',
      views: 'Views',
      created: 'Created',
      expires: 'Expires',
      opened: 'Opened',
      burned: 'Zeroed',
      reports: 'Reports',
      ip: 'IP',
      userAgent: 'User-Agent',
      quarantine: 'Quarantine',
      delete: 'Delete'
    },
    events: 'Events',
    none: 'None.',
    userPage: 'User page',
    adminAccessTitle: 'Admin access required',
    adminAccessCopy: 'Use the admin username and password from environment variables.',
    langToggle: '中文',
    promptBlock: 'Reason for blocking this source?',
    promptLift: 'Reason for lifting this block?',
    promptAction: (action) => `Reason for ${action}?`,
    promptConfirmReport: 'Confirmation note?',
    promptRejectReport: 'Rejection note?',
    promptDeleteOptional: 'Delete note (optional)',
    modalCancel: 'Cancel',
    modalSubmit: 'Confirm',
    loginTitle: 'Admin login',
    loginCopy: 'Confirm access before entering the console.',
    loginUsername: 'Admin username',
    loginUsernamePlaceholder: 'Enter username',
    loginPassword: 'Enter password',
    loginPasswordPlaceholder: 'Enter password',
    loginButton: 'Enter console',
    loginChecking: 'Checking...',
    loginNote: '',
    loginError: 'Login failed'
  }
};

export async function startAdmin(root) {
  rootElement = root;
  language = localStorage.getItem(LANG_KEY) || 'zh';
  if (window.location.pathname === '/admin/login' || !isAdminUnlocked()) {
    renderAdminLogin();
    return;
  }
  await renderAdminApp();
}

async function renderAdminApp() {
  renderAdminShell();
  bindAdminShell();
  await loadSection('dashboard');
}

function renderAdminLogin() {
  const copy = tr();
  rootElement.innerHTML = `
    <div class="site-shell">
      <header class="topbar">
        <a class="brand" href="/">
          ${brandMark()}
          <span>Burn0</span>
        </a>
        <button class="nav-link lang-toggle" type="button" data-lang-toggle>${copy.langToggle}</button>
      </header>
      <main class="message-page">
        <section class="message-panel login-panel">
          <p class="eyebrow">${copy.adminEyebrow}</p>
          <h1>${copy.loginTitle}</h1>
          <p class="message-copy">${copy.loginCopy}</p>
          <form id="adminLoginForm" class="login-form">
            <div class="field">
              <label class="label" for="adminUsername">${copy.loginUsername}</label>
              <input id="adminUsername" name="username" type="text" autocomplete="username" placeholder="${copy.loginUsernamePlaceholder}" value="${escapeAttr(localStorage.getItem(ADMIN_USERNAME_KEY) || '')}">
            </div>
            <div class="field">
              <label class="label" for="adminPassword">${copy.loginPassword}</label>
              <input id="adminPassword" name="password" type="password" autocomplete="current-password" placeholder="${copy.loginPasswordPlaceholder}">
            </div>
            <button class="primary-button" id="adminLoginButton" type="submit">${copy.loginButton}</button>
            <p class="meta">${copy.loginNote}</p>
            <div id="adminLoginResult" aria-live="polite"></div>
          </form>
        </section>
      </main>
    </div>
  `;

  document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
  document.getElementById('adminUsername').focus();
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const copy = tr();
  const form = event.currentTarget;
  const button = document.getElementById('adminLoginButton');
  const result = document.getElementById('adminLoginResult');
  const username = form.username.value.trim();
  const password = form.password.value;

  button.disabled = true;
  button.textContent = copy.loginChecking;
  result.innerHTML = '';

  try {
    if (username) {
      localStorage.setItem(ADMIN_USERNAME_KEY, username);
    }
    await adminApi('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    localStorage.setItem(ADMIN_UNLOCK_KEY, '1');
    window.history.replaceState({}, '', '/admin');
    await renderAdminApp();
  } catch (error) {
    result.innerHTML = `<div class="notice is-danger">${copy.loginError}: ${escapeHtml(error.message)}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = copy.loginButton;
  }
}

function isAdminUnlocked() {
  return localStorage.getItem(ADMIN_UNLOCK_KEY) === '1';
}

function renderAdminShell() {
  const copy = tr();
  rootElement.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <a class="brand" href="/">
          ${brandMark()}
          <span>Burn0</span>
        </a>
        <nav class="admin-nav" aria-label="${copy.adminNav}">
          ${navButton('dashboard', copy.nav.dashboard)}
          ${navButton('messages', copy.nav.messages)}
          ${navButton('reports', copy.nav.reports)}
          ${navButton('blocked', copy.nav.blocked)}
          ${navButton('settings', copy.nav.settings)}
        </nav>
        <button class="ghost-button lang-toggle" type="button" data-lang-toggle>${copy.langToggle}</button>
        <p class="meta" id="adminIdentity">${copy.checkingAccess}</p>
      </aside>
      <main class="admin-main" id="adminMain"></main>
      <aside class="drawer" id="messageDrawer" aria-live="polite"></aside>
    </div>
  `;
}

function bindAdminShell() {
  document.querySelector('.admin-nav').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-section]');
    if (!button) {
      return;
    }
    await loadSection(button.dataset.section);
  });
}

async function loadSection(section) {
  activeSection = section;
  updateActiveNav();

  try {
    const me = await adminApi('/api/admin/me');
    document.getElementById('adminIdentity').textContent = `${me.admin.email} · ${me.admin.role}`;
  } catch (error) {
    localStorage.removeItem(ADMIN_UNLOCK_KEY);
    window.history.replaceState({}, '', '/admin/login');
    renderAdminLogin();
    return;
  }

  if (section === 'dashboard') {
    await renderDashboard();
  } else if (section === 'messages') {
    await renderMessages();
  } else if (section === 'reports') {
    await renderReports();
  } else if (section === 'blocked') {
    await renderBlocked();
  } else if (section === 'settings') {
    await renderSettings();
  }
}

async function renderDashboard() {
  const copy = tr();
  const main = adminMain();
  main.innerHTML = header(copy.dashboardTitle, copy.dashboardCopy);

  const data = await adminApi('/api/admin/metrics');
  const metrics = data.metrics;
  const cards = [
    [copy.metrics.total, metrics.total],
    [copy.metrics.active, metrics.active],
    [copy.metrics.burned, metrics.burned],
    [copy.metrics.expired, metrics.expired],
    [copy.metrics.quarantined, metrics.quarantined],
    [copy.metrics.deleted, metrics.deleted],
    [copy.metrics.openReports, metrics.openReports],
    [copy.metrics.blockedSources, metrics.blockedSources],
    [copy.metrics.recentMessages, metrics.recentMessages],
    [copy.metrics.recentReports, metrics.recentReports]
  ];

  main.insertAdjacentHTML('beforeend', `
    <section class="admin-grid">
      ${cards.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('')}
    </section>
  `);
}

async function renderMessages() {
  const copy = tr();
  const main = adminMain();
  main.innerHTML = `
    ${header(copy.messagesTitle, copy.messagesCopy)}
    <div class="toolbar">
      <select id="statusFilter" aria-label="Filter by status">
        ${statusOption('all', copy.statuses.all)}
        ${statusOption('active', copy.statuses.active)}
        ${statusOption('burned', copy.statuses.burned)}
        ${statusOption('expired', copy.statuses.expired)}
        ${statusOption('quarantined', copy.statuses.quarantined)}
        ${statusOption('deleted', copy.statuses.deleted)}
      </select>
      <input id="messageSearch" type="search" placeholder="${copy.searchPlaceholder}">
      <button class="secondary-button" id="refreshMessages" type="button">${copy.refresh}</button>
    </div>
    <div id="messageTable"></div>
  `;

  document.getElementById('statusFilter').value = currentStatus;
  document.getElementById('messageSearch').value = currentQuery;
  document.getElementById('statusFilter').addEventListener('change', async (event) => {
    currentStatus = event.target.value;
    await fetchAndRenderMessages();
  });
  document.getElementById('messageSearch').addEventListener('input', debounce(async (event) => {
    currentQuery = event.target.value;
    await fetchAndRenderMessages();
  }, 240));
  document.getElementById('refreshMessages').addEventListener('click', fetchAndRenderMessages);

  await fetchAndRenderMessages();
}

async function fetchAndRenderMessages() {
  const copy = tr();
  const target = document.getElementById('messageTable');
  target.innerHTML = `<div class="empty">${copy.loadingMessages}</div>`;

  const params = new URLSearchParams({ status: currentStatus, limit: '60' });
  if (currentQuery.trim()) {
    params.set('q', currentQuery.trim());
  }

  const data = await adminApi(`/api/admin/messages?${params.toString()}`);
  const rows = data.messages || [];
  if (!rows.length) {
    target.innerHTML = `<div class="empty">${copy.noMessages}</div>`;
    return;
  }

  target.innerHTML = `
    ${bulkToolbar('messages', copy)}
    <div class="table-wrap">
      <table class="admin-table messages-table">
        <thead>
          <tr>
            <th class="select-cell"><input type="checkbox" data-select-all="messages" aria-label="${copy.selectAll}"></th>
            <th>${copy.headers.status}</th>
            <th>${copy.headers.summary}</th>
            <th>${copy.headers.views}</th>
            <th>${copy.headers.created}</th>
            <th>${copy.headers.expires}</th>
            <th>${copy.headers.reports}</th>
            <th>${copy.headers.source}</th>
            <th>${copy.headers.action}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(messageRow).join('')}
        </tbody>
      </table>
    </div>
  `;

  bindBulkSelection(target, 'messages', deleteSelectedMessages);
  target.querySelector('tbody').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-open-message]');
    if (button) {
      await openMessageDrawer(button.dataset.openMessage);
    }
  });
}

async function renderReports() {
  const copy = tr();
  const main = adminMain();
  main.innerHTML = `${header(copy.reportsTitle, copy.reportsCopy)}<div id="reportsTable"></div>`;
  const data = await adminApi('/api/admin/reports');
  const rows = data.reports || [];
  const target = document.getElementById('reportsTable');

  if (!rows.length) {
    target.innerHTML = `<div class="empty">${copy.noReports}</div>`;
    return;
  }

  target.innerHTML = `
    ${bulkToolbar('reports', copy)}
    <div class="table-wrap">
      <table class="admin-table reports-table">
        <thead>
          <tr>
            <th class="select-cell"><input type="checkbox" data-select-all="reports" aria-label="${copy.selectAll}"></th>
            <th>${copy.headers.status}</th>
            <th>${copy.headers.message}</th>
            <th>${copy.headers.reason}</th>
            <th>${copy.headers.source}</th>
            <th>${copy.headers.created}</th>
            <th>${copy.headers.views}</th>
            <th>${copy.headers.action}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((report) => `
            <tr>
              <td class="select-cell"><input type="checkbox" data-select-reports value="${report.id}" aria-label="${copy.selectAll}"></td>
              <td>${statusPill(report.status)}</td>
              <td><button class="ghost-button table-id" data-open-message="${escapeAttr(report.message_id)}">${escapeHtml(report.message_id)}</button></td>
              <td>
                <div class="cell-stack">
                  <span class="report-reason">${escapeHtml(formatReportReason(report.reason))}</span>
                  ${report.details ? `<span class="meta table-summary" title="${escapeAttr(report.details)}">${escapeHtml(report.details)}</span>` : ''}
                </div>
              </td>
              <td class="source-cell">${sourceIpDisplay(report.reporterIp)}</td>
              <td>${formatDate(report.created_at)}</td>
              <td>${formatViews(report.view_count, report.max_views)}</td>
              <td>${reportActions(report, copy)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  bindBulkSelection(target, 'reports', deleteSelectedReports);
  target.addEventListener('click', async (event) => {
    const open = event.target.closest('[data-open-message]');
    const confirm = event.target.closest('[data-confirm-report]');
    const reject = event.target.closest('[data-reject-report]');
    if (open) {
      await openMessageDrawer(open.dataset.openMessage);
    }
    if (confirm) {
      await reviewReport(confirm.dataset.confirmReport, 'confirm');
      await renderReports();
    }
    if (reject) {
      await reviewReport(reject.dataset.rejectReport, 'reject');
      await renderReports();
    }
  });
}

async function renderBlocked() {
  const copy = tr();
  const main = adminMain();
  main.innerHTML = `
    ${header(copy.blockedTitle, copy.blockedCopy)}
    <form class="toolbar" id="blockForm">
      <select name="blockType">
        <option value="ip">${copy.blockForm.ip}</option>
        <option value="user_agent">${copy.blockForm.userAgent}</option>
      </select>
      <input name="value" placeholder="${copy.blockForm.value}">
      <button class="secondary-button" type="submit">${copy.block}</button>
    </form>
    <div id="blockedTable"></div>
  `;

  document.getElementById('blockForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const reason = await requestReason(copy.promptBlock);
    if (!reason) {
      return;
    }
    await adminApi('/api/admin/blocked-sources', {
      method: 'POST',
      body: JSON.stringify({
        blockType: form.blockType.value,
        value: form.value.value,
        reason
      })
    });
    await renderBlocked();
  });

  await fetchBlocked();
}

async function fetchBlocked() {
  const copy = tr();
  const target = document.getElementById('blockedTable');
  const data = await adminApi('/api/admin/blocked-sources');
  const rows = data.blockedSources || [];

  if (!rows.length) {
    target.innerHTML = `<div class="empty">${copy.noBlocked}</div>`;
    return;
  }

  target.innerHTML = `
    <div class="table-wrap">
      <table class="admin-table blocked-table">
        <thead>
          <tr>
            <th>${copy.headers.status}</th>
            <th>${copy.headers.type}</th>
            <th>${copy.headers.source}</th>
            <th>${copy.headers.reason}</th>
            <th>${copy.headers.created}</th>
            <th>${copy.headers.action}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${statusPill(row.status)}</td>
              <td>${escapeHtml(row.block_type)}</td>
              <td>${escapeHtml(row.value || '')}</td>
              <td>${escapeHtml(row.reason)}</td>
              <td>${formatDate(row.created_at)}</td>
              <td>${row.status === 'active' ? `<button class="secondary-button" data-lift-block="${row.id}" type="button">${copy.lift}</button>` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  target.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-lift-block]');
    if (!button) {
      return;
    }
    const reason = await requestReason(copy.promptLift);
    if (!reason) {
      return;
    }
    await adminApi(`/api/admin/blocked-sources/${button.dataset.liftBlock}/lift`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    await fetchBlocked();
  });
}

async function renderSettings(message = '') {
  const copy = tr();
  const main = adminMain();
  const data = await adminApi('/api/admin/settings');
  const cleanup = data.cleanup;
  const purgeable = data.purgeable || {};

  main.innerHTML = `
    ${header(copy.settingsTitle, copy.settingsCopy)}
    <section class="settings-panel">
      <form class="settings-form" id="cleanupForm">
        <h2>${copy.cleanupTitle}</h2>
        <label class="toggle-row">
          <input name="enabled" type="checkbox"${cleanup.enabled ? ' checked' : ''}>
          <span>${copy.cleanupEnabled}</span>
        </label>
        <label>
          <span>${copy.cleanupIntervalHours}</span>
          <input name="intervalHours" type="number" min="1" max="720" step="1" value="${escapeAttr(cleanup.intervalHours)}">
        </label>
        <label>
          <span>${copy.cleanupRetentionDays}</span>
          <input name="retentionDays" type="number" min="1" max="3650" step="1" value="${escapeAttr(cleanup.retentionDays)}">
        </label>
        <div class="settings-actions">
          <button class="secondary-button" type="submit">${copy.saveSettings}</button>
          <button class="danger-button" id="purgeNow" type="button">${copy.purgeNow}</button>
        </div>
      </form>
      <dl class="settings-stats">
        <div><dt>${copy.cleanupPurgeable}</dt><dd>${Number(purgeable.messages || 0)}</dd></div>
        <div><dt>${copy.cleanupCutoff}</dt><dd>${formatDate(purgeable.cutoff)}</dd></div>
        <div><dt>${copy.cleanupLastRun}</dt><dd>${cleanup.lastRunAt ? formatDate(cleanup.lastRunAt) : copy.cleanupNever}</dd></div>
      </dl>
    </section>
    <div id="settingsNotice">${message ? `<div class="notice">${escapeHtml(message)}</div>` : ''}</div>
  `;

  document.getElementById('cleanupForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      cleanup: {
        enabled: form.elements.enabled.checked,
        intervalHours: form.elements.intervalHours.value,
        retentionDays: form.elements.retentionDays.value
      }
    };
    await adminApi('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    await renderSettings(copy.settingsSaved);
  });

  document.getElementById('purgeNow').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const result = await adminApi('/api/admin/settings/purge', { method: 'POST' });
      await renderSettings(copy.purgeResult(result.result));
    } finally {
      button.disabled = false;
    }
  });
}

async function openMessageDrawer(messageId) {
  const copy = tr();
  const drawer = document.getElementById('messageDrawer');
  drawer.classList.add('is-open');
  drawer.innerHTML = `
    <div class="drawer-header">
      <strong>${copy.messageTitle}</strong>
      <button class="ghost-button" id="closeDrawer" type="button">${copy.close}</button>
    </div>
    <div class="drawer-body">
      <div class="empty">${copy.loadingMessages}</div>
    </div>
  `;
  document.getElementById('closeDrawer').addEventListener('click', closeDrawer);

  const data = await adminApi(`/api/admin/messages/${encodeURIComponent(messageId)}`);
  const message = data.message;

  drawer.innerHTML = `
    <div class="drawer-header">
      <div>
        <strong>${escapeHtml(message.id)}</strong>
        <div>${statusPill(message.status)}</div>
      </div>
      <button class="ghost-button" id="closeDrawer" type="button">${copy.close}</button>
    </div>
    <div class="drawer-body">
      <div class="message-body admin-message-body">${escapeHtml(message.text || '[content unavailable]')}</div>
      <div class="action-row">
        <button class="secondary-button" data-action="quarantine" data-id="${escapeAttr(message.id)}" type="button">${copy.quarantine}</button>
        <button class="danger-button" data-action="delete" data-id="${escapeAttr(message.id)}" type="button">${copy.delete}</button>
        <button class="secondary-button" data-action="ban" data-id="${escapeAttr(message.id)}" type="button">${copy.ban}</button>
      </div>
      <dl class="kv-grid">
        <dt>${copy.fields.mode}</dt><dd>${formatBurnMode(message.burnMode)}</dd>
        <dt>${copy.fields.views}</dt><dd>${formatViews(message.viewCount, message.maxViews)}</dd>
        <dt>${copy.fields.created}</dt><dd>${formatDate(message.createdAt)}</dd>
        <dt>${copy.fields.expires}</dt><dd>${formatDate(message.expiresAt)}</dd>
        <dt>${copy.fields.opened}</dt><dd>${formatDate(message.openedAt)}</dd>
        <dt>${copy.fields.burned}</dt><dd>${formatDate(message.burnedAt)}</dd>
        <dt>${copy.fields.reports}</dt><dd>${message.reportCount}</dd>
        <dt>${copy.fields.ip}</dt><dd class="source-cell">${sourceIpDisplay(message.creatorIp)}</dd>
        <dt>${copy.fields.userAgent}</dt><dd>${escapeHtml(message.userAgentSummary || '')}</dd>
        <dt>${copy.fields.quarantine}</dt><dd>${escapeHtml(message.quarantineReason || '')}</dd>
        <dt>${copy.fields.delete}</dt><dd>${escapeHtml(message.deleteReason || '')}</dd>
      </dl>
      <h2>${copy.reportsTitle}</h2>
      ${reportDetailList(data.reports)}
      <h2>${copy.events}</h2>
      ${simpleList(data.events, (event) => `${event.event_type} · ${event.actor_type} · ${event.reason || ''} · ${formatDate(event.created_at)}`)}
    </div>
  `;

  document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
  drawer.addEventListener('click', drawerActionHandler, { once: true });
}

async function drawerActionHandler(event) {
  const button = event.target.closest('[data-action]');
  if (!button) {
    document.getElementById('messageDrawer').addEventListener('click', drawerActionHandler, { once: true });
    return;
  }

  const allowEmptyReason = button.dataset.action === 'delete';
  const reason = await requestReason(tr().promptAction(actionLabel(button.dataset.action)), { allowEmpty: allowEmptyReason });
  if (reason === undefined || (!allowEmptyReason && !reason)) {
    document.getElementById('messageDrawer').addEventListener('click', drawerActionHandler, { once: true });
    return;
  }

  const id = encodeURIComponent(button.dataset.id);
  const endpoint = button.dataset.action === 'ban'
    ? `/api/admin/messages/${id}/ban-source`
    : `/api/admin/messages/${id}/${button.dataset.action}`;

  await adminApi(endpoint, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });

  await openMessageDrawer(button.dataset.id);
  if (activeSection === 'messages') {
    await fetchAndRenderMessages();
  }
}

async function reviewReport(reportId, action) {
  const copy = tr();
  const isReject = action === 'reject';
  const resolution = await requestReason(isReject ? copy.promptRejectReport : copy.promptConfirmReport);
  if (!resolution) {
    return;
  }

  await adminApi(`/api/admin/reports/${reportId}/${isReject ? 'reject' : 'confirm'}`, {
    method: 'POST',
    body: JSON.stringify({ resolution })
  });
}

function bulkToolbar(type, copy) {
  return `
    <div class="bulk-toolbar">
      <span class="meta" data-selection-count="${type}">0</span>
      <button class="danger-button" type="button" data-bulk-delete="${type}" disabled>${copy.deleteSelected}</button>
    </div>
  `;
}

function bindBulkSelection(container, type, deleteHandler) {
  const selectAll = container.querySelector(`[data-select-all="${type}"]`);
  const deleteButton = container.querySelector(`[data-bulk-delete="${type}"]`);
  const count = container.querySelector(`[data-selection-count="${type}"]`);
  const checkboxes = () => Array.from(container.querySelectorAll(`[data-select-${type}]`));
  const refresh = () => {
    const selected = selectedBulkValues(container, type);
    if (count) {
      count.textContent = String(selected.length);
    }
    if (deleteButton) {
      deleteButton.disabled = selected.length === 0;
    }
    if (selectAll) {
      const boxes = checkboxes();
      selectAll.checked = boxes.length > 0 && boxes.every((box) => box.checked);
      selectAll.indeterminate = boxes.some((box) => box.checked) && !selectAll.checked;
    }
  };

  selectAll?.addEventListener('change', () => {
    for (const checkbox of checkboxes()) {
      checkbox.checked = selectAll.checked;
    }
    refresh();
  });

  container.addEventListener('change', (event) => {
    if (event.target.matches(`[data-select-${type}]`)) {
      refresh();
    }
  });

  deleteButton?.addEventListener('click', async () => {
    await deleteHandler(container);
  });

  refresh();
}

function selectedBulkValues(container, type) {
  return Array.from(container.querySelectorAll(`[data-select-${type}]:checked`))
    .map((checkbox) => checkbox.value)
    .filter(Boolean);
}

async function deleteSelectedMessages(container) {
  const ids = selectedBulkValues(container, 'messages');
  const reason = await requestReason(tr().promptDeleteOptional, { allowEmpty: true });
  if (reason === undefined) {
    return;
  }
  await adminApi('/api/admin/messages/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ ids, reason })
  });
  await fetchAndRenderMessages();
}

async function deleteSelectedReports(container) {
  const ids = selectedBulkValues(container, 'reports');
  const reason = await requestReason(tr().promptDeleteOptional, { allowEmpty: true });
  if (reason === undefined) {
    return;
  }
  await adminApi('/api/admin/reports/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ ids, reason })
  });
  await renderReports();
}

function closeDrawer() {
  const drawer = document.getElementById('messageDrawer');
  drawer.classList.remove('is-open');
  drawer.innerHTML = '';
}

function renderAccessError(error) {
  const copy = tr();
  adminMain().innerHTML = `
    ${header(copy.adminAccessTitle, copy.adminAccessCopy)}
    <div class="notice is-danger">${escapeHtml(error.message)}</div>
  `;
}

function messageRow(message) {
  const copy = tr();
  return `
    <tr>
      <td class="select-cell"><input type="checkbox" data-select-messages value="${escapeAttr(message.id)}" aria-label="${copy.selectAll}"></td>
      <td>${statusPill(message.status)}</td>
      <td><span class="table-summary" title="${escapeAttr(message.summary)}">${escapeHtml(message.summary)}</span></td>
      <td>${formatViews(message.viewCount, message.maxViews)}</td>
      <td>${formatDate(message.createdAt)}</td>
      <td>${formatDate(message.expiresAt)}</td>
      <td>${message.reportCount}</td>
      <td class="source-cell">${sourceIpDisplay(message.creatorIp, 'meta')}</td>
      <td><button class="secondary-button" data-open-message="${escapeAttr(message.id)}" type="button">${copy.view}</button></td>
    </tr>
  `;
}

function reportActions(report, copy) {
  if (report.status !== 'open') {
    return '';
  }

  const id = escapeAttr(report.id);
  return `
    <div class="table-actions">
      <button class="secondary-button" data-confirm-report="${id}" type="button">${copy.confirmReport}</button>
      <button class="ghost-button" data-reject-report="${id}" type="button">${copy.rejectReport}</button>
    </div>
  `;
}

function statusPill(status) {
  const label = tr().statuses[status] || status || 'unknown';
  return `<span class="status-pill ${escapeAttr(status)}">${escapeHtml(label)}</span>`;
}

function formatViews(viewCount, maxViews) {
  if (maxViews === null || maxViews === undefined || maxViews === '') {
    return '—';
  }

  return `${Number(viewCount || 0)} / ${maxViews}`;
}

function formatBurnMode(mode) {
  const labels = language === 'zh'
    ? {
      view_limit: '按次数',
      time_limit: '按时间',
      time_and_view: '时间或次数'
    }
    : {
      view_limit: 'Opens',
      time_limit: 'Time',
      time_and_view: 'Time or opens'
    };

  return labels[mode] || mode || '—';
}

function formatReportReason(reason) {
  const labels = tr().reportReasons || {};
  return labels[reason] || reason || '—';
}

function sourceIpDisplay(value, extraClass = '') {
  const ip = value || '';
  const classes = ['source-ip', extraClass].filter(Boolean).join(' ');
  return `<span class="${classes}" title="${escapeAttr(ip)}">${escapeHtml(ip)}</span>`;
}

function reportDetailList(rows) {
  if (!rows || !rows.length) {
    return `<div class="empty">${tr().none}</div>`;
  }

  return `
    <div class="detail-list">
      ${rows.map((report) => `
        <div class="detail-list-item">
          <div class="detail-list-heading">
            <strong>${escapeHtml(formatReportReason(report.reason))}</strong>
            ${statusPill(report.status)}
          </div>
          <span class="meta">${formatDate(report.created_at)}</span>
          ${report.details ? `<p>${escapeHtml(report.details)}</p>` : ''}
          ${report.resolution ? `<p>${escapeHtml(report.resolution)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function statusOption(value, label) {
  return `<option value="${value}">${label}</option>`;
}

function navButton(section, label) {
  return `<button type="button" data-section="${section}">${label}</button>`;
}

function header(title, copy) {
  const labels = tr();
  return `
    <header class="admin-header">
      <div>
        <p class="eyebrow">${labels.adminEyebrow}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">${escapeHtml(copy)}</p>
      </div>
      <a class="ghost-button" href="/">${labels.userPage}</a>
    </header>
  `;
}

function simpleList(rows, mapRow) {
  if (!rows || !rows.length) {
    return `<div class="empty">${tr().none}</div>`;
  }

  return `<div class="notice">${rows.map((row) => `<div>${escapeHtml(mapRow(row))}</div>`).join('')}</div>`;
}

function updateActiveNav() {
  for (const button of document.querySelectorAll('[data-section]')) {
    button.classList.toggle('is-active', button.dataset.section === activeSection);
  }
}

function adminMain() {
  return document.getElementById('adminMain');
}

function requestReason(title, options = {}) {
  const copy = tr();
  const allowEmpty = Boolean(options.allowEmpty);
  const existing = document.querySelector('.modal-backdrop');
  if (existing) {
    existing.remove();
  }

  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '60';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '16px';
    modal.style.background = 'rgba(0, 0, 0, 0.72)';
    modal.style.backdropFilter = 'blur(10px)';
    modal.innerHTML = `
      <section class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="reasonDialogTitle" style="width:100%;max-width:460px;box-sizing:border-box;border:1px solid var(--border);border-radius:8px;background:#0f0f0f;">
        <form class="modal-form">
          <div>
            <p class="eyebrow">${copy.adminEyebrow}</p>
            <h2 id="reasonDialogTitle">${escapeHtml(title)}</h2>
          </div>
          <textarea id="reasonDialogInput" maxlength="300" rows="4"${allowEmpty ? '' : ' required'}></textarea>
          <div class="modal-actions">
            <button class="ghost-button" type="button" data-modal-cancel>${copy.modalCancel}</button>
            <button class="secondary-button" type="submit">${copy.modalSubmit}</button>
          </div>
        </form>
      </section>
    `;

    const close = (value) => {
      document.removeEventListener('keydown', handleKeydown);
      modal.remove();
      resolve(value);
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        close(undefined);
      }
    };

    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-modal-cancel]')) {
        close(undefined);
      }
    });

    modal.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      const value = modal.querySelector('#reasonDialogInput').value.trim();
      close(value || (allowEmpty ? '' : null));
    });

    document.addEventListener('keydown', handleKeydown);
    document.body.appendChild(modal);
    modal.querySelector('#reasonDialogInput').focus();
  });
}

async function adminApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Admin request failed.');
  }

  return payload;
}

function actionLabel(action) {
  const copy = tr();
  if (action === 'quarantine') {
    return copy.quarantine;
  }
  if (action === 'delete') {
    return copy.delete;
  }
  if (action === 'ban') {
    return copy.ban;
  }
  return action;
}

function tr() {
  language = localStorage.getItem(LANG_KEY) || language || 'zh';
  return ADMIN_COPY[language] || ADMIN_COPY.zh;
}

function brandMark() {
  return `
    <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
      <path class="brand-zero" d="M51.7 35.5A20 20 0 1 1 41.2 14.1"/>
      <path class="brand-ember" d="M47.3 19.1A20 20 0 0 1 51.7 35.5"/>
    </svg>
  `;
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
