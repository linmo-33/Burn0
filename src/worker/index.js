const MAX_TEXT_LENGTH = 10000;
const MIN_EXPIRY_SECONDS = 60;
const MAX_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_EXPIRY_SECONDS = 24 * 60 * 60;
const MAX_VIEW_LIMIT = 20;
const ADMIN_COOKIE_NAME = 'burn0_admin';
const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
const STATUS_PUBLIC_COPY = {
  burned: 'This content has returned to zero.',
  expired: 'This content has expired.',
  quarantined: 'This content is unavailable.',
  deleted: 'This content is unavailable.',
  not_found: 'No readable content was found.'
};
const DATABASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  ciphertext TEXT,
  encryption_iv TEXT,
  encryption_version INTEGER NOT NULL DEFAULT 1,
  encryption_key_id TEXT,
  text_size INTEGER NOT NULL DEFAULT 0,
  burn_mode TEXT NOT NULL DEFAULT 'time_and_view',
  max_views INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  opened_at TEXT,
  burned_at TEXT,
  expired_at TEXT,
  quarantined_at TEXT,
  deleted_at TEXT,
  creator_ip_hash TEXT,
  creator_ip_ciphertext TEXT,
  user_agent_hash TEXT,
  user_agent_summary TEXT,
  risk_score INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  last_reported_at TEXT,
  delete_reason TEXT,
  quarantine_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_status_created ON messages(status, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_creator_ip_hash ON messages(creator_ip_hash);
CREATE INDEX IF NOT EXISTS idx_messages_reported ON messages(report_count, last_reported_at);

CREATE TABLE IF NOT EXISTS message_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  ip_hash TEXT,
  user_agent_summary TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_events_message ON message_events(message_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_events_type ON message_events(event_type, created_at);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  reporter_ip_hash TEXT,
  reporter_ip_ciphertext TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  resolution TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_message ON reports(message_id, created_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  ip_hash TEXT,
  ip_ciphertext TEXT,
  user_agent_summary TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs(target_type, target_id, created_at);

CREATE TABLE IF NOT EXISTS blocked_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_type TEXT NOT NULL,
  value_hash TEXT NOT NULL,
  value_ciphertext TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  lifted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_blocked_sources_lookup ON blocked_sources(block_type, value_hash, status);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ip_hash TEXT,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_window ON rate_limit_events(event_key, window_start);
`;
let databaseReadyPromise = null;

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: baseHeaders() });
      }

      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, ctx, url);
      }

      if (!env.ASSETS) {
        return textResponse('Static asset binding is not configured.', 500);
      }

      return withSecurityHeaders(await env.ASSETS.fetch(request));
    } catch (error) {
      return handleError(error, env);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduledTasks(env));
  }
};

export class MessageGate {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      if (request.method !== 'POST' || !url.pathname.endsWith('/open')) {
        throw httpError(404, 'not_found', 'Unknown message gate route.');
      }

      const body = await readJson(request);
      await ensureDatabase(this.env);
      return await openMessage(this.env, body);
    } catch (error) {
      return handleError(error, this.env);
    }
  }
}

async function runScheduledTasks(env) {
  await ensureDatabase(env);
  await expireMessages(env);
}

async function ensureDatabase(env) {
  if (!env.DB) {
    throw httpError(500, 'missing_d1_binding', 'D1 binding DB is not configured.');
  }

  if (!databaseReadyPromise) {
    databaseReadyPromise = initializeDatabase(env).catch((error) => {
      databaseReadyPromise = null;
      throw error;
    });
  }

  await databaseReadyPromise;
}

async function initializeDatabase(env) {
  // Empty D1 databases from forked deployments are prepared on the first API request.
  if (typeof env.DB.exec === 'function') {
    await env.DB.exec(DATABASE_SCHEMA);
    return;
  }

  for (const statement of DATABASE_SCHEMA.split(';').map((part) => part.trim()).filter(Boolean)) {
    await env.DB.prepare(statement).run();
  }
}

async function handleApi(request, env, ctx, url) {
  const { pathname } = url;

  if (request.method === 'GET' && pathname === '/api/health') {
    return jsonResponse({
      ok: true,
      service: 'burn0',
      environment: env.APP_ENV || 'unknown',
      time: new Date().toISOString()
    });
  }

  if (request.method === 'GET' && pathname === '/api/public-config') {
    return jsonResponse({
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
      turnstileRequired: Boolean(env.TURNSTILE_SECRET_KEY)
    });
  }

  if (request.method === 'POST' && pathname === '/api/admin/logout') {
    return adminLogout();
  }

  await ensureDatabase(env);

  if (request.method === 'POST' && pathname === '/api/messages') {
    return await createMessage(request, env, url);
  }

  const statusMatch = pathname.match(/^\/api\/messages\/([^/]+)\/status$/);
  if (request.method === 'GET' && statusMatch) {
    return await getMessageStatus(env, decodeURIComponent(statusMatch[1]));
  }

  const openMatch = pathname.match(/^\/api\/messages\/([^/]+)\/open$/);
  if (request.method === 'POST' && openMatch) {
    const messageId = decodeURIComponent(openMatch[1]);
    const metadata = await requestMetadata(request, env);
    const stub = env.MESSAGE_GATE.get(env.MESSAGE_GATE.idFromName(messageId));
    return await stub.fetch('https://message-gate/open', {
      method: 'POST',
      body: JSON.stringify({ messageId, metadata })
    });
  }

  const reportMatch = pathname.match(/^\/api\/messages\/([^/]+)\/report$/);
  if (request.method === 'POST' && reportMatch) {
    return await reportMessage(request, env, decodeURIComponent(reportMatch[1]));
  }

  if (request.method === 'POST' && pathname === '/api/admin/login') {
    return await adminLogin(request, env);
  }

  if (pathname.startsWith('/api/admin/')) {
    return await handleAdminApi(request, env, ctx, url);
  }

  throw httpError(404, 'not_found', 'API route not found.');
}

async function createMessage(request, env, url) {
  const body = await readJson(request);
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const burnMode = normalizeBurnMode(body.burnMode);
  const usesViewLimit = hasViewLimitMode(burnMode);
  const usesTimeLimit = hasTimeLimitMode(burnMode);
  const maxViews = usesViewLimit ? clampInteger(body.maxViews, 1, MAX_VIEW_LIMIT, 1) : null;
  const expiresInSeconds = usesTimeLimit
    ? clampInteger(body.expiresInSeconds, MIN_EXPIRY_SECONDS, MAX_EXPIRY_SECONDS, DEFAULT_EXPIRY_SECONDS)
    : null;

  if (!text) {
    throw httpError(400, 'empty_message', 'Message text is required.');
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw httpError(400, 'message_too_long', `Message must be ${MAX_TEXT_LENGTH} characters or fewer.`);
  }

  const metadata = await requestMetadata(request, env);
  await verifyTurnstile(body.turnstileToken, env, metadata.ip);
  await assertSourceAllowed(env, metadata);

  const messageId = randomId();
  const now = new Date();
  const expiresAt = usesTimeLimit ? new Date(now.getTime() + expiresInSeconds * 1000).toISOString() : null;
  const encrypted = await encryptString(text, env);

  await env.DB.prepare(
    `INSERT INTO messages (
      id, status, ciphertext, encryption_iv, encryption_version, encryption_key_id,
      text_size, burn_mode, max_views, view_count, created_at, expires_at,
      creator_ip_hash, creator_ip_ciphertext, user_agent_hash, user_agent_summary
    ) VALUES (?, 'active', ?, ?, 1, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      messageId,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.keyId,
      text.length,
      burnMode,
      maxViews,
      now.toISOString(),
      expiresAt,
      metadata.ipHash,
      metadata.ipCiphertext,
      metadata.userAgentHash,
      metadata.userAgentSummary
    )
    .run();

  await insertEvent(env, {
    messageId,
    eventType: 'created',
    actorType: 'visitor',
    ipHash: metadata.ipHash,
    userAgentSummary: metadata.userAgentSummary,
    reason: createLimitReason(burnMode, maxViews, expiresAt)
  });

  return jsonResponse(
    {
      id: messageId,
      shareUrl: `${url.origin}/m/${messageId}`,
      status: 'active',
      burnMode,
      maxViews,
      viewCount: 0,
      expiresAt
    },
    201
  );
}

async function getMessageStatus(env, messageId) {
  const message = await getMessage(env, messageId);
  if (!message) {
    return jsonResponse(publicStatus('not_found'), 404);
  }

  const effectiveStatus = effectivePublicStatus(message);
  return jsonResponse({
    id: message.id,
    status: effectiveStatus,
    copy: STATUS_PUBLIC_COPY[effectiveStatus] || null,
    burnMode: message.burn_mode,
    maxViews: message.max_views,
    viewCount: message.view_count,
    remainingViews: remainingViews(message),
    expiresAt: message.expires_at
  });
}

async function openMessage(env, body) {
  const messageId = requireMessageId(body.messageId);
  const metadata = body.metadata || {};
  const message = await getMessage(env, messageId);

  if (!message) {
    return jsonResponse(publicStatus('not_found'), 404);
  }

  const status = effectivePublicStatus(message);
  if (status !== 'active') {
    if (status === 'expired' && message.status !== 'expired') {
      await markExpired(env, message, new Date().toISOString());
    }
    return jsonResponse({
      ...publicStatus(status),
      burnMode: message.burn_mode,
      maxViews: message.max_views,
      viewCount: message.view_count,
      remainingViews: remainingViews(message)
    }, status === 'not_found' ? 404 : 409);
  }

  const nextViewCount = message.view_count + 1;
  const isBurned = messageHasViewLimit(message) && nextViewCount >= message.max_views;
  const now = new Date().toISOString();
  const plaintext = await decryptString(message.ciphertext, message.encryption_iv, env);

  await env.DB.prepare(
    `UPDATE messages
       SET view_count = ?,
           opened_at = COALESCE(opened_at, ?),
           burned_at = CASE WHEN ? THEN ? ELSE burned_at END,
           status = CASE WHEN ? THEN 'burned' ELSE status END
     WHERE id = ?`
  )
    .bind(nextViewCount, now, isBurned ? 1 : 0, now, isBurned ? 1 : 0, messageId)
    .run();

  await insertEvent(env, {
    messageId,
    eventType: 'opened',
    actorType: 'visitor',
    ipHash: metadata.ipHash,
    userAgentSummary: metadata.userAgentSummary,
    reason: `view_count=${nextViewCount}`
  });

  if (isBurned) {
    await insertEvent(env, {
      messageId,
      eventType: 'burned',
      actorType: 'system',
      reason: 'view limit reached'
    });
  }

  return jsonResponse({
    id: messageId,
    text: plaintext,
    status: isBurned ? 'burned' : 'active',
    burnMode: message.burn_mode,
    maxViews: message.max_views,
    viewCount: nextViewCount,
    remainingViews: remainingViews({ ...message, view_count: nextViewCount }),
    expiresAt: message.expires_at,
    burned: isBurned
  });
}

async function reportMessage(request, env, messageId) {
  const body = await readJson(request);
  const reason = normalizeReason(body.reason);
  const details = typeof body.details === 'string' ? body.details.trim().slice(0, 1000) : '';
  const metadata = await requestMetadata(request, env);
  const now = new Date().toISOString();

  const message = await getMessage(env, messageId);
  if (!message) {
    return jsonResponse(publicStatus('not_found'), 404);
  }

  await env.DB.prepare(
    `INSERT INTO reports (message_id, reason, details, reporter_ip_hash, reporter_ip_ciphertext, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?)`
  )
    .bind(messageId, reason, details || null, metadata.ipHash, metadata.ipCiphertext, now)
    .run();

  await env.DB.prepare(
    `UPDATE messages
        SET report_count = report_count + 1,
            last_reported_at = ?,
            status = CASE
              WHEN status IN ('active', 'reported') THEN 'quarantined'
              ELSE status
            END,
            quarantined_at = CASE
              WHEN status IN ('active', 'reported') THEN ?
              ELSE quarantined_at
            END,
            quarantine_reason = CASE
              WHEN status IN ('active', 'reported') THEN ?
              ELSE quarantine_reason
            END
      WHERE id = ?`
  )
    .bind(now, now, `User report: ${reason}`, messageId)
    .run();

  await insertEvent(env, {
    messageId,
    eventType: 'reported',
    actorType: 'visitor',
    ipHash: metadata.ipHash,
    userAgentSummary: metadata.userAgentSummary,
    reason
  });

  await insertEvent(env, {
    messageId,
    eventType: 'quarantined',
    actorType: 'system',
    reason: 'user report'
  });

  return jsonResponse({ ok: true, status: 'quarantined' });
}

async function handleAdminApi(request, env, _ctx, url) {
  const admin = await requireAdmin(request, env);
  const pathname = url.pathname;

  if (request.method === 'GET' && pathname === '/api/admin/me') {
    return jsonResponse({ admin: publicAdmin(admin) });
  }

  if (request.method === 'GET' && pathname === '/api/admin/metrics') {
    return await adminMetrics(env);
  }

  if (request.method === 'GET' && pathname === '/api/admin/messages') {
    return await adminListMessages(env, url);
  }

  if (request.method === 'POST' && pathname === '/api/admin/messages/batch-delete') {
    requirePermission(admin, 'moderate');
    return await adminBatchDeleteMessages(request, env, admin);
  }

  const detailMatch = pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
  if (request.method === 'GET' && detailMatch) {
    return await adminGetMessage(request, env, admin, decodeURIComponent(detailMatch[1]), url);
  }

  const quarantineMatch = pathname.match(/^\/api\/admin\/messages\/([^/]+)\/quarantine$/);
  if (request.method === 'POST' && quarantineMatch) {
    requirePermission(admin, 'moderate');
    return await adminQuarantineMessage(request, env, admin, decodeURIComponent(quarantineMatch[1]));
  }

  const deleteMatch = pathname.match(/^\/api\/admin\/messages\/([^/]+)\/delete$/);
  if (request.method === 'POST' && deleteMatch) {
    requirePermission(admin, 'moderate');
    return await adminDeleteMessage(request, env, admin, decodeURIComponent(deleteMatch[1]));
  }

  const banSourceMatch = pathname.match(/^\/api\/admin\/messages\/([^/]+)\/ban-source$/);
  if (request.method === 'POST' && banSourceMatch) {
    requirePermission(admin, 'moderate');
    return await adminBanMessageSource(request, env, admin, decodeURIComponent(banSourceMatch[1]));
  }

  if (request.method === 'GET' && pathname === '/api/admin/reports') {
    return await adminReports(env);
  }

  if (request.method === 'POST' && pathname === '/api/admin/reports/batch-delete') {
    requirePermission(admin, 'moderate');
    return await adminBatchDeleteReports(request, env, admin);
  }

  const reviewReportMatch = pathname.match(/^\/api\/admin\/reports\/(\d+)\/(confirm|reject)$/);
  if (request.method === 'POST' && reviewReportMatch) {
    requirePermission(admin, 'moderate');
    return await adminReviewReport(request, env, admin, Number(reviewReportMatch[1]), reviewReportMatch[2]);
  }

  if (request.method === 'GET' && pathname === '/api/admin/blocked-sources') {
    return await adminBlockedSources(env);
  }

  if (request.method === 'POST' && pathname === '/api/admin/blocked-sources') {
    requirePermission(admin, 'moderate');
    return await adminCreateBlockedSource(request, env, admin);
  }

  const liftBlockMatch = pathname.match(/^\/api\/admin\/blocked-sources\/(\d+)\/lift$/);
  if (request.method === 'POST' && liftBlockMatch) {
    requirePermission(admin, 'moderate');
    return await adminLiftBlockedSource(request, env, admin, Number(liftBlockMatch[1]));
  }

  if (request.method === 'GET' && pathname === '/api/admin/audit-logs') {
    return await adminAuditLogs(env);
  }

  if (request.method === 'POST' && pathname === '/api/admin/audit-logs/batch-delete') {
    requirePermission(admin, 'moderate');
    return await adminBatchDeleteAuditLogs(request, env, admin);
  }

  throw httpError(404, 'not_found', 'Admin API route not found.');
}

async function adminMetrics(env) {
  const statuses = await env.DB.prepare(
    `SELECT status, COUNT(*) AS count
       FROM messages
      GROUP BY status`
  ).all();
  const reportCount = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM reports WHERE status = 'open'`
  ).first();
  const blockedCount = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM blocked_sources WHERE status = 'active'`
  ).first();
  const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentMessages = await env.DB.prepare(
    `SELECT COUNT(*) AS count
       FROM messages
      WHERE created_at >= ?`
  )
    .bind(recentSince)
    .first();
  const recentReports = await env.DB.prepare(
    `SELECT COUNT(*) AS count
       FROM reports
      WHERE created_at >= ?`
  )
    .bind(recentSince)
    .first();

  const metrics = {
    total: 0,
    active: 0,
    burned: 0,
    expired: 0,
    reported: 0,
    quarantined: 0,
    deleted: 0,
    openReports: Number(reportCount?.count || 0),
    blockedSources: Number(blockedCount?.count || 0),
    recentMessages: Number(recentMessages?.count || 0),
    recentReports: Number(recentReports?.count || 0)
  };

  for (const row of statuses.results || []) {
    const count = Number(row.count || 0);
    metrics.total += count;
    if (Object.hasOwn(metrics, row.status)) {
      metrics[row.status] = count;
    }
  }

  return jsonResponse({ metrics });
}

async function adminListMessages(env, url) {
  const status = url.searchParams.get('status') || 'all';
  const query = (url.searchParams.get('q') || '').trim().toLowerCase();
  const limit = clampInteger(url.searchParams.get('limit'), 1, 100, 50);
  const clauses = [];
  const binds = [];

  if (status !== 'all') {
    clauses.push('status = ?');
    binds.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await env.DB.prepare(
    `SELECT *
       FROM messages
       ${where}
      ORDER BY created_at DESC
      LIMIT ?`
  )
    .bind(...binds, query ? 100 : limit)
    .all();

  const messages = [];
  for (const row of rows.results || []) {
    const plaintext = await decryptSafe(row, env);
    if (query && !plaintext.toLowerCase().includes(query)) {
      continue;
    }
    const sourceIp = row.creator_ip_ciphertext
      ? await decryptPackedString(row.creator_ip_ciphertext, env).catch(() => null)
      : null;

    messages.push({
      id: row.id,
      status: effectivePublicStatus(row),
      storedStatus: row.status,
      burnMode: row.burn_mode,
      summary: summarizeText(plaintext, row.status),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      openedAt: row.opened_at,
      burnedAt: row.burned_at,
      viewCount: row.view_count,
      maxViews: row.max_views,
      reportCount: row.report_count,
      creatorIp: sourceIp,
      userAgentSummary: row.user_agent_summary,
      riskScore: row.risk_score
    });

    if (messages.length >= limit) {
      break;
    }
  }

  return jsonResponse({ messages });
}

async function adminGetMessage(request, env, admin, messageId, url) {
  const message = await getMessage(env, messageId);
  if (!message) {
    throw httpError(404, 'not_found', 'Message not found.');
  }

  const reason = (url.searchParams.get('reason') || 'Manual admin review').slice(0, 200);
  const plaintext = await decryptSafe(message, env);
  const sourceIp = message.creator_ip_ciphertext
    ? await decryptPackedString(message.creator_ip_ciphertext, env).catch(() => null)
    : null;

  await insertAuditLog(env, request, admin, {
    action: 'view_message',
    targetType: 'message',
    targetId: messageId,
    reason
  });

  const events = await env.DB.prepare(
    `SELECT event_type, actor_type, actor_id, reason, created_at
       FROM message_events
      WHERE message_id = ?
      ORDER BY created_at DESC
      LIMIT 50`
  )
    .bind(messageId)
    .all();

  const reports = await env.DB.prepare(
    `SELECT id, reason, details, status, created_at, reviewed_at, resolution
       FROM reports
      WHERE message_id = ?
      ORDER BY created_at DESC
      LIMIT 25`
  )
    .bind(messageId)
    .all();

  return jsonResponse({
    message: {
      id: message.id,
      status: effectivePublicStatus(message),
      storedStatus: message.status,
      burnMode: message.burn_mode,
      text: plaintext,
      textSize: message.text_size,
      createdAt: message.created_at,
      expiresAt: message.expires_at,
      openedAt: message.opened_at,
      burnedAt: message.burned_at,
      expiredAt: message.expired_at,
      quarantinedAt: message.quarantined_at,
      deletedAt: message.deleted_at,
      viewCount: message.view_count,
      maxViews: message.max_views,
      reportCount: message.report_count,
      creatorIp: sourceIp,
      userAgentHash: message.user_agent_hash,
      userAgentSummary: message.user_agent_summary,
      riskScore: message.risk_score,
      deleteReason: message.delete_reason,
      quarantineReason: message.quarantine_reason
    },
    events: events.results || [],
    reports: reports.results || [],
    viewedBy: publicAdmin(admin)
  });
}

async function adminQuarantineMessage(request, env, admin, messageId) {
  const body = await readJson(request);
  const reason = requiredReason(body.reason, 'Quarantine reason is required.');
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE messages
        SET status = 'quarantined',
            quarantined_at = COALESCE(quarantined_at, ?),
            quarantine_reason = ?
      WHERE id = ? AND status != 'deleted'`
  )
    .bind(now, reason, messageId)
    .run();

  await insertEvent(env, { messageId, eventType: 'quarantined', actorType: 'admin', actorId: admin.id, reason });
  await insertAuditLog(env, request, admin, {
    action: 'quarantine_message',
    targetType: 'message',
    targetId: messageId,
    reason
  });

  return jsonResponse({ ok: true, status: 'quarantined' });
}

async function adminDeleteMessage(request, env, admin, messageId) {
  const body = await readJson(request);
  const reason = optionalReason(body.reason);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE messages
        SET status = 'deleted',
            ciphertext = NULL,
            encryption_iv = NULL,
            deleted_at = COALESCE(deleted_at, ?),
            delete_reason = ?
      WHERE id = ?`
  )
    .bind(now, reason, messageId)
    .run();

  await insertEvent(env, { messageId, eventType: 'deleted', actorType: 'admin', actorId: admin.id, reason });
  await insertAuditLog(env, request, admin, {
    action: 'delete_message',
    targetType: 'message',
    targetId: messageId,
    reason
  });

  return jsonResponse({ ok: true, status: 'deleted' });
}

async function adminBatchDeleteMessages(request, env, admin) {
  const body = await readJson(request);
  const ids = normalizeStringIds(body.ids, 100);
  const reason = optionalReason(body.reason);
  const now = new Date().toISOString();

  if (!ids.length) {
    throw httpError(400, 'ids_required', 'At least one message id is required.');
  }

  for (const messageId of ids) {
    await env.DB.prepare(
      `UPDATE messages
          SET status = 'deleted',
              ciphertext = NULL,
              encryption_iv = NULL,
              deleted_at = COALESCE(deleted_at, ?),
              delete_reason = ?
        WHERE id = ?`
    )
      .bind(now, reason || null, messageId)
      .run();

    await insertEvent(env, { messageId, eventType: 'deleted', actorType: 'admin', actorId: admin.id, reason });
  }

  await insertAuditLog(env, request, admin, {
    action: 'batch_delete_messages',
    targetType: 'message',
    targetId: ids.join(','),
    reason
  });

  return jsonResponse({ ok: true, deleted: ids.length });
}

async function adminBanMessageSource(request, env, admin, messageId) {
  const body = await readJson(request);
  const reason = requiredReason(body.reason, 'Ban reason is required.');
  const message = await getMessage(env, messageId);
  if (!message || !message.creator_ip_hash) {
    throw httpError(404, 'source_not_found', 'Message source was not found.');
  }

  const sourceIp = message.creator_ip_ciphertext
    ? await decryptPackedString(message.creator_ip_ciphertext, env).catch(() => null)
    : null;
  await createBlock(env, admin, 'ip', message.creator_ip_hash, reason, sourceIp);
  await insertEvent(env, { messageId, eventType: 'source_banned', actorType: 'admin', actorId: admin.id, reason });
  await insertAuditLog(env, request, admin, {
    action: 'ban_source',
    targetType: 'message',
    targetId: messageId,
    reason
  });

  return jsonResponse({ ok: true });
}

async function adminReports(env) {
  const rows = await env.DB.prepare(
    `SELECT r.id, r.message_id, r.reason, r.details, r.status, r.created_at, r.reporter_ip_ciphertext,
            m.status AS message_status, m.view_count, m.max_views, m.report_count
       FROM reports r
       LEFT JOIN messages m ON m.id = r.message_id
      ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT 100`
  ).all();

  const reports = [];
  for (const row of rows.results || []) {
    const reporterIp = row.reporter_ip_ciphertext
      ? await decryptPackedString(row.reporter_ip_ciphertext, env).catch(() => null)
      : null;
    reports.push({ ...row, reporterIp });
  }

  return jsonResponse({ reports });
}

async function adminReviewReport(request, env, admin, reportId, action) {
  const body = await readJson(request);
  const isReject = action === 'reject';
  const resolution = requiredReason(
    body.resolution,
    isReject ? 'Rejection note is required.' : 'Confirmation note is required.'
  );
  const report = await env.DB.prepare(`SELECT id, message_id, status FROM reports WHERE id = ? LIMIT 1`)
    .bind(reportId)
    .first();
  if (!report) {
    throw httpError(404, 'report_not_found', 'Report not found.');
  }
  if (report.status !== 'open') {
    throw httpError(409, 'report_already_reviewed', 'Report has already been reviewed.');
  }

  const now = new Date().toISOString();
  const nextStatus = isReject ? 'rejected' : 'confirmed';

  await env.DB.prepare(
    `UPDATE reports
        SET status = ?,
            reviewed_at = ?,
            reviewed_by = ?,
            resolution = ?
      WHERE id = ?`
  )
    .bind(nextStatus, now, admin.id, resolution, reportId)
    .run();

  const messageRestored = isReject
    ? await restoreMessageAfterRejectedReport(env, admin, report, resolution)
    : false;

  await insertAuditLog(env, request, admin, {
    action: isReject ? 'reject_report' : 'confirm_report',
    targetType: 'report',
    targetId: String(reportId),
    reason: resolution
  });

  return jsonResponse({ ok: true, status: nextStatus, messageRestored });
}

async function restoreMessageAfterRejectedReport(env, admin, report, reason) {
  const pending = await env.DB.prepare(
    `SELECT COUNT(*) AS count
       FROM reports
      WHERE message_id = ? AND status = 'open'`
  )
    .bind(report.message_id)
    .first();
  if (Number(pending?.count || 0) > 0) {
    return false;
  }

  const message = await getMessage(env, report.message_id);
  if (!message || message.status !== 'quarantined') {
    return false;
  }

  // 举报会先隐藏消息；驳回全部待审核举报后，只解除由用户举报触发的隔离。
  if (message.quarantine_reason && !message.quarantine_reason.startsWith('User report:')) {
    return false;
  }

  await env.DB.prepare(
    `UPDATE messages
        SET status = 'active',
            quarantined_at = NULL,
            quarantine_reason = NULL
      WHERE id = ? AND status = 'quarantined'`
  )
    .bind(report.message_id)
    .run();

  await insertEvent(env, {
    messageId: report.message_id,
    eventType: 'quarantine_lifted',
    actorType: 'admin',
    actorId: admin.id,
    reason
  });

  return true;
}

async function adminBatchDeleteReports(request, env, admin) {
  const body = await readJson(request);
  const ids = normalizeIntegerIds(body.ids, 100);
  const reason = optionalReason(body.reason);

  if (!ids.length) {
    throw httpError(400, 'ids_required', 'At least one report id is required.');
  }

  const placeholders = ids.map(() => '?').join(',');
  const existing = await env.DB.prepare(
    `SELECT id, message_id
       FROM reports
      WHERE id IN (${placeholders})`
  )
    .bind(...ids)
    .all();
  const messageIds = [...new Set((existing.results || []).map((row) => row.message_id).filter(Boolean))];

  await env.DB.prepare(`DELETE FROM reports WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run();

  for (const messageId of messageIds) {
    const stats = await env.DB.prepare(
      `SELECT COUNT(*) AS count, MAX(created_at) AS last_reported_at
         FROM reports
        WHERE message_id = ?`
    )
      .bind(messageId)
      .first();
    await env.DB.prepare(
      `UPDATE messages
          SET report_count = ?,
              last_reported_at = ?
        WHERE id = ?`
    )
      .bind(Number(stats?.count || 0), stats?.last_reported_at || null, messageId)
      .run();
  }

  await insertAuditLog(env, request, admin, {
    action: 'batch_delete_reports',
    targetType: 'report',
    targetId: ids.join(','),
    reason
  });

  return jsonResponse({ ok: true, deleted: ids.length });
}

async function adminBlockedSources(env) {
  const rows = await env.DB.prepare(
    `SELECT id, block_type, value_hash, value_ciphertext, reason, status, created_by, created_at, expires_at, lifted_at
       FROM blocked_sources
      ORDER BY created_at DESC
      LIMIT 100`
  ).all();

  const blockedSources = [];
  for (const row of rows.results || []) {
    const value = row.value_ciphertext
      ? await decryptPackedString(row.value_ciphertext, env).catch(() => null)
      : null;
    blockedSources.push({ ...row, value });
  }

  return jsonResponse({ blockedSources });
}

async function adminCreateBlockedSource(request, env, admin) {
  const body = await readJson(request);
  const blockType = ['ip', 'user_agent'].includes(body.blockType) ? body.blockType : 'ip';
  const value = typeof body.value === 'string' ? body.value.trim().slice(0, 500) : '';
  const reason = requiredReason(body.reason, 'Ban reason is required.');

  if (!value) {
    throw httpError(400, 'missing_source_value', 'A source value is required.');
  }

  const valueHash = await stableHash(value, env);
  await createBlock(env, admin, blockType, valueHash, reason, value);
  await insertAuditLog(env, request, admin, {
    action: 'ban_source',
    targetType: 'blocked_source',
    targetId: `${blockType}:${value}`,
    reason
  });

  return jsonResponse({ ok: true });
}

async function adminLiftBlockedSource(request, env, admin, blockId) {
  const body = await readJson(request);
  const reason = requiredReason(body.reason, 'Lift reason is required.');
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE blocked_sources
        SET status = 'lifted',
            lifted_at = ?
      WHERE id = ?`
  )
    .bind(now, blockId)
    .run();

  await insertAuditLog(env, request, admin, {
    action: 'unban_source',
    targetType: 'blocked_source',
    targetId: String(blockId),
    reason
  });

  return jsonResponse({ ok: true });
}

async function adminAuditLogs(env) {
  const rows = await env.DB.prepare(
    `SELECT id, admin_id, action, target_type, target_id, reason, ip_hash, ip_ciphertext, user_agent_summary, created_at
       FROM admin_audit_logs
      ORDER BY created_at DESC
      LIMIT 100`
  ).all();

  const auditLogs = [];
  for (const row of rows.results || []) {
    const ip = row.ip_ciphertext
      ? await decryptPackedString(row.ip_ciphertext, env).catch(() => null)
      : null;
    auditLogs.push({ ...row, ip });
  }

  return jsonResponse({ auditLogs });
}

async function adminBatchDeleteAuditLogs(request, env, admin) {
  const body = await readJson(request);
  const ids = normalizeIntegerIds(body.ids, 100);
  const reason = optionalReason(body.reason);

  if (!ids.length) {
    throw httpError(400, 'ids_required', 'At least one audit log id is required.');
  }

  const placeholders = ids.map(() => '?').join(',');
  await env.DB.prepare(`DELETE FROM admin_audit_logs WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run();

  await insertAuditLog(env, request, admin, {
    action: 'batch_delete_audit_logs',
    targetType: 'admin_audit_log',
    targetId: ids.join(','),
    reason
  });

  return jsonResponse({ ok: true, deleted: ids.length });
}

async function expireMessages(env) {
  const now = new Date().toISOString();
  const rows = await env.DB.prepare(
      `SELECT id
       FROM messages
      WHERE status IN ('active', 'reported')
        AND expires_at IS NOT NULL
        AND expires_at <= ?
      LIMIT 200`
  )
    .bind(now)
    .all();

  for (const row of rows.results || []) {
    await env.DB.prepare(
      `UPDATE messages
          SET status = 'expired',
              expired_at = COALESCE(expired_at, ?)
        WHERE id = ? AND status IN ('active', 'reported')`
    )
      .bind(now, row.id)
      .run();

    await insertEvent(env, {
      messageId: row.id,
      eventType: 'expired',
      actorType: 'system',
      reason: 'cron expiry'
    });
  }
}

async function adminLogin(request, env) {
  const body = await readJson(request);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const expectedUsername = adminUsername(env);
  const expectedPassword = adminPassword(env);

  if (!constantTimeEqual(username, expectedUsername) || !constantTimeEqual(password, expectedPassword)) {
    throw httpError(401, 'invalid_admin_credentials', 'Invalid admin username or password.');
  }

  const admin = await ensureEnvAdmin(env, username);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: admin.id,
    username,
    role: admin.role,
    exp: nowSeconds + ADMIN_SESSION_SECONDS
  };
  const cookie = await signAdminSession(payload, env);

  const response = jsonResponse({ ok: true, admin: publicAdmin(admin) });
  response.headers.append('set-cookie', adminSessionCookie(cookie, env));
  return response;
}

function adminLogout() {
  const response = jsonResponse({ ok: true });
  response.headers.append(
    'set-cookie',
    `${ADMIN_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
  );
  return response;
}

async function requireAdmin(request, env) {
  const session = await readAdminSession(request, env);
  if (!session) {
    throw httpError(401, 'admin_auth_required', 'Admin login is required.');
  }

  const admin = await env.DB.prepare(
    `SELECT id, email, role, status, created_at, last_login_at
       FROM admin_users
      WHERE id = ?
      LIMIT 1`
  )
    .bind(session.sub)
    .first();

  if (!admin || admin.status !== 'active') {
    throw httpError(403, 'admin_forbidden', 'Admin account is not allowed.');
  }

  return admin;
}

async function ensureEnvAdmin(env, username) {
  const now = new Date().toISOString();
  const id = `admin_${(await sha256Hex(username.toLowerCase())).slice(0, 16)}`;
  let admin = await env.DB.prepare(
    `SELECT id, email, role, status, created_at, last_login_at
       FROM admin_users
      WHERE id = ?
      LIMIT 1`
  )
    .bind(id)
    .first();

  if (!admin) {
    await env.DB.prepare(
      `INSERT INTO admin_users (id, email, role, status, created_at, last_login_at)
       VALUES (?, ?, 'owner', 'active', ?, ?)`
    )
      .bind(id, username, now, now)
      .run();
    admin = { id, email: username, role: 'owner', status: 'active', created_at: now, last_login_at: now };
  } else {
    await env.DB.prepare(`UPDATE admin_users SET last_login_at = ? WHERE id = ?`)
      .bind(now, id)
      .run();
    admin.last_login_at = now;
  }

  return admin;
}

async function readAdminSession(request, env) {
  const cookie = parseCookie(request.headers.get('cookie') || '')[ADMIN_COOKIE_NAME];
  if (!cookie) {
    return null;
  }

  const payload = await verifyAdminSession(cookie, env);
  if (!payload || Number(payload.exp || 0) <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

async function signAdminSession(payload, env) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSha256Base64Url(encodedPayload, adminSessionSecret(env));
  return `${encodedPayload}.${signature}`;
}

async function verifyAdminSession(cookie, env) {
  const [encodedPayload, signature] = String(cookie).split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await hmacSha256Base64Url(encodedPayload, adminSessionSecret(env));
  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch (_error) {
    return null;
  }
}

function adminSessionCookie(value, env) {
  const secure = (env.APP_ENV || 'development') === 'production' ? '; Secure' : '';
  return `${ADMIN_COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_SECONDS}${secure}`;
}

function adminUsername(env) {
  const username = String(env.ADMIN_USERNAME || '').trim();
  if (!username) {
    throw httpError(500, 'missing_admin_username', 'ADMIN_USERNAME is not configured.');
  }
  return username;
}

function adminPassword(env) {
  const password = String(env.ADMIN_PASSWORD || '');
  if (!password) {
    throw httpError(500, 'missing_admin_password', 'ADMIN_PASSWORD is not configured.');
  }
  return password;
}

function adminSessionSecret(env) {
  const secret = String(env.ADMIN_SESSION_SECRET || '');
  if (secret.length < 24) {
    throw httpError(500, 'missing_admin_session_secret', 'ADMIN_SESSION_SECRET must be at least 24 characters.');
  }
  return secret;
}

function requirePermission(admin, permission) {
  const role = admin.role;
  if (role === 'owner') {
    return;
  }

  if (permission === 'moderate' && role === 'moderator') {
    return;
  }

  throw httpError(403, 'admin_forbidden', 'Admin role is not allowed for this action.');
}

async function createBlock(env, admin, blockType, valueHash, reason, displayValue = null) {
  const valueCiphertext = displayValue ? await encryptPackedString(displayValue, env) : null;
  await env.DB.prepare(
    `INSERT INTO blocked_sources (block_type, value_hash, value_ciphertext, reason, status, created_by, created_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?)`
  )
    .bind(blockType, valueHash, valueCiphertext, reason, admin.id, new Date().toISOString())
    .run();
}

async function assertSourceAllowed(env, metadata) {
  const block = await env.DB.prepare(
    `SELECT id
       FROM blocked_sources
      WHERE (
          (block_type = 'ip' AND value_hash = ?)
          OR (block_type = 'user_agent' AND value_hash = ?)
        )
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > ?)
      LIMIT 1`
  )
    .bind(metadata.ipHash, metadata.userAgentHash, new Date().toISOString())
    .first();

  if (block) {
    throw httpError(403, 'source_blocked', 'This source is blocked.');
  }
}

async function requestMetadata(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '0.0.0.0';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ipHash = await stableHash(ip, env);
  const userAgentHash = await stableHash(userAgent, env);

  return {
    ip,
    ipHash,
    ipCiphertext: await encryptPackedString(ip, env),
    userAgentHash,
    userAgentSummary: summarizeUserAgent(userAgent)
  };
}

async function verifyTurnstile(token, env, ip) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return;
  }

  if (!token) {
    throw httpError(400, 'turnstile_required', 'Verification is required.');
  }

  const formData = new FormData();
  formData.append('secret', env.TURNSTILE_SECRET_KEY);
  formData.append('response', token);
  formData.append('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData
  });
  const result = await response.json();

  if (!result.success) {
    throw httpError(400, 'turnstile_failed', 'Verification failed.');
  }
}

async function getMessage(env, messageId) {
  return await env.DB.prepare(`SELECT * FROM messages WHERE id = ? LIMIT 1`)
    .bind(requireMessageId(messageId))
    .first();
}

function requireMessageId(messageId) {
  const id = String(messageId || '').trim();
  if (!/^[a-zA-Z0-9_-]{10,80}$/.test(id)) {
    throw httpError(400, 'invalid_message_id', 'Message id is invalid.');
  }
  return id;
}

function effectivePublicStatus(message) {
  if (!message) {
    return 'not_found';
  }

  if (message.status === 'active' && messageHasTimeLimit(message) && new Date(message.expires_at).getTime() <= Date.now()) {
    return 'expired';
  }

  if (message.status === 'active' && messageHasViewLimit(message) && message.view_count >= message.max_views) {
    return 'burned';
  }

  return message.status;
}

function messageHasTimeLimit(message) {
  return Boolean(message?.expires_at);
}

function messageHasViewLimit(message) {
  return Number.isInteger(Number(message?.max_views)) && Number(message.max_views) > 0;
}

function remainingViews(message) {
  if (!messageHasViewLimit(message)) {
    return null;
  }

  return Math.max(0, Number(message.max_views) - Number(message.view_count || 0));
}

async function markExpired(env, message, now) {
  await env.DB.prepare(
    `UPDATE messages
        SET status = 'expired',
            expired_at = COALESCE(expired_at, ?)
      WHERE id = ? AND status = 'active'`
  )
    .bind(now, message.id)
    .run();

  await insertEvent(env, {
    messageId: message.id,
    eventType: 'expired',
    actorType: 'system',
    reason: 'open attempt after expiry'
  });
}

async function insertEvent(env, event) {
  await env.DB.prepare(
    `INSERT INTO message_events (
      message_id, event_type, actor_type, actor_id, ip_hash, user_agent_summary, reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      event.messageId,
      event.eventType,
      event.actorType,
      event.actorId || null,
      event.ipHash || null,
      event.userAgentSummary || null,
      event.reason || null,
      new Date().toISOString()
    )
    .run();
}

async function insertAuditLog(env, request, admin, audit) {
  const metadata = await requestMetadata(request, env);
  await env.DB.prepare(
    `INSERT INTO admin_audit_logs (
      admin_id, action, target_type, target_id, reason, ip_hash, ip_ciphertext, user_agent_summary, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      admin.id,
      audit.action,
      audit.targetType,
      audit.targetId,
      audit.reason || null,
      metadata.ipHash,
      metadata.ipCiphertext,
      metadata.userAgentSummary,
      new Date().toISOString()
    )
    .run();
}

async function encryptString(value, env) {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const key = await contentKey(env);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, encoded);
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(ivBytes),
    keyId: contentKeyId(env)
  };
}

async function encryptPackedString(value, env) {
  const encrypted = await encryptString(value, env);
  return `${encrypted.iv}:${encrypted.ciphertext}`;
}

async function decryptString(ciphertext, iv, env) {
  if (!ciphertext || !iv) {
    return '';
  }

  const key = await contentKey(env);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}

async function decryptPackedString(value, env) {
  const separatorIndex = String(value).indexOf(':');
  if (separatorIndex < 0) {
    return '';
  }

  const iv = value.slice(0, separatorIndex);
  const ciphertext = value.slice(separatorIndex + 1);
  return await decryptString(ciphertext, iv, env);
}

async function decryptSafe(row, env) {
  if (!row?.ciphertext || !row?.encryption_iv) {
    return '';
  }

  try {
    return await decryptString(row.ciphertext, row.encryption_iv, env);
  } catch (_error) {
    return '[unable to decrypt]';
  }
}

async function contentKey(env) {
  const secret = env.CONTENT_ENCRYPTION_KEY || developmentSecret(env, 'CONTENT_ENCRYPTION_KEY');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function contentKeyId(env) {
  return env.CONTENT_ENCRYPTION_KEY_ID || 'v1';
}

function developmentSecret(env, name) {
  if ((env.APP_ENV || 'development') === 'production') {
    throw httpError(500, 'missing_secret', `${name} is not configured.`);
  }

  return `burn0-development-${name.toLowerCase()}-replace-before-deploy`;
}

async function stableHash(value, env) {
  const secret = env.IP_HASH_SECRET || developmentSecret(env, 'IP_HASH_SECRET');
  return await sha256Hex(`${secret}:${value}`);
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Base64Url(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return bytesToBase64Url(bytes);
}

function base64UrlEncode(value) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return new TextDecoder().decode(base64ToBytes(normalized + padding));
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseCookie(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) {
      cookies[key] = value;
    }
  }
  return cookies;
}

function constantTimeEqual(left, right) {
  const leftBytes = new TextEncoder().encode(String(left));
  const rightBytes = new TextEncoder().encode(String(right));
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }

  return diff === 0;
}

function publicStatus(status) {
  return {
    status,
    copy: STATUS_PUBLIC_COPY[status] || 'This message is not available.'
  };
}

function normalizeBurnMode(mode) {
  const allowed = new Set(['time_limit', 'view_limit', 'time_and_view']);
  const value = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  if (allowed.has(value)) {
    return value;
  }

  throw httpError(400, 'invalid_burn_mode', 'Burn mode is required.');
}

function hasTimeLimitMode(mode) {
  return mode === 'time_limit' || mode === 'time_and_view';
}

function hasViewLimitMode(mode) {
  return mode === 'view_limit' || mode === 'time_and_view';
}

function createLimitReason(burnMode, maxViews, expiresAt) {
  const parts = [`burn_mode=${burnMode}`];
  if (maxViews) {
    parts.push(`max_views=${maxViews}`);
  }
  if (expiresAt) {
    parts.push(`expires_at=${expiresAt}`);
  }
  return parts.join(' ');
}

function normalizeReason(reason) {
  const allowed = new Set(['illegal', 'abuse', 'spam', 'harassment', 'other']);
  const value = typeof reason === 'string' ? reason.trim().toLowerCase() : '';
  return allowed.has(value) ? value : 'other';
}

function requiredReason(reason, message) {
  const value = typeof reason === 'string' ? reason.trim().slice(0, 300) : '';
  if (!value) {
    throw httpError(400, 'reason_required', message);
  }
  return value;
}

function optionalReason(reason) {
  return typeof reason === 'string' ? reason.trim().slice(0, 300) : '';
}

function normalizeStringIds(ids, limit) {
  if (!Array.isArray(ids)) {
    return [];
  }
  return [...new Set(ids
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean))]
    .slice(0, limit);
}

function normalizeIntegerIds(ids, limit) {
  if (!Array.isArray(ids)) {
    return [];
  }
  return [...new Set(ids
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isInteger(id) && id > 0))]
    .slice(0, limit);
}

function summarizeText(text, status) {
  if (!text) {
    return status === 'deleted' ? '[content deleted]' : '[empty or unavailable]';
  }

  return text.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function summarizeUserAgent(userAgent) {
  return String(userAgent || 'unknown').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function shortenHash(hash) {
  return hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : '';
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (_error) {
    throw httpError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
}

function publicAdmin(admin) {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role
  };
}

function handleError(error, env) {
  const status = error.status || 500;
  if (status >= 500) {
    console.error(error?.stack || error);
  }

  const payload = {
    error: error.code || 'internal_error',
    message: status >= 500 ? 'Internal server error.' : error.message
  };

  if (status >= 500 && (env?.APP_ENV || 'development') !== 'production') {
    payload.detail = error.stack || String(error);
  }

  return jsonResponse(payload, status);
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...baseHeaders(),
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function textResponse(text, status = 200) {
  return new Response(text, {
    status,
    headers: {
      ...baseHeaders(),
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function withSecurityHeaders(response) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(baseHeaders())) {
    next.headers.set(key, value);
  }
  next.headers.set('referrer-policy', 'no-referrer');
  next.headers.set('x-robots-tag', 'noindex,nofollow,noarchive');
  return next;
}

function baseHeaders() {
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()'
  };
}
