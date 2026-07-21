import { icon } from '/icons.js';

const root = document.getElementById('root');
const MAX_TEXT_LENGTH = 15000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const LANG_KEY = 'burn0_lang';
let language = localStorage.getItem(LANG_KEY) || 'zh';
let adminTriggerCount = 0;
let adminTriggerTimer;
let publicConfigPromise;
let turnstileScriptPromise;
let turnstileWidgetId = null;
let turnstileToken = '';
let imageComposerConfig = { imageSharingEnabled: false, maxImageBytes: MAX_IMAGE_BYTES };
let imagePreviewUrl = '';

const USER_COPY = {
  zh: {
    navAdmin: '管理',
    langToggle: 'EN',
    heroEyebrow: '私密链接 · 到时归零',
    heroTitle: 'Burn to Zero.',
    heroLede: '写下内容，生成一条短暂存在的链接。',
    featureText: '私密链接',
    featureViews: '限次打开',
    featureExpiry: '定时归零',
    featureModerated: '不进公开列表',
    createEyebrow: '创建',
    createTitle: '创建归零链接',
    composerNote: '归零链接：限时、限次。',
    contentType: '内容类型',
    contentText: '文本',
    contentImage: '图片',
    messageText: '消息内容',
    textareaPlaceholder: '写下要发送的内容。',
    imageFile: '图片内容',
    imagePlaceholder: '选择或粘贴一张 JPEG、PNG、WebP 或 GIF 图片。',
    imagePasteLabel: '图片选择框，支持粘贴图片',
    chooseImage: '选择图片',
    removeImage: '移除',
    burnMode: '归零方式',
    expiry: '过期时间',
    viewLimit: '打开次数',
    customExpiryPlaceholder: '分钟，最多 10080',
    customViewsPlaceholder: '次数，最多 20',
    createButton: '创建归零链接',
    creating: '创建中...',
    required: '请填写消息内容。',
    imageRequired: '请选择图片。',
    imageTooLarge: (max) => `图片不能超过 ${formatBytes(max)}。`,
    imageUnsupported: '仅支持 JPEG、PNG、WebP、GIF 图片。',
    verifyHuman: '验证',
    verificationRequired: '请先完成人机验证。',
    verificationConfigError: '人机验证配置未完成。',
    ready: '归零链接已生成。',
    burnsAfter: (message) => limitSummary(message),
    copy: '复制',
    copied: '已复制',
    burnLink: '归零链接',
    opening: '正在打开。',
    openingCopy: '链接正在读取。',
    unavailable: '已归零。',
    cannotOpen: '没有可读取的内容。',
    openedEyebrow: 'Burn0 · 已打开',
    openedTitle: '消息内容',
    openedImageTitle: '图片内容',
    openedLede: '内容只在当前窗口显示，关闭后可能无法再次读取。',
    openedBurned: '本次打开后，这条链接已归零。',
    imageLoadError: '图片不可读取。',
    burnedTitle: '已归零',
    burnedCopy: '内容已归零，不再显示。',
    expiredCopy: '时间已归零，不再显示。',
    removedCopy: '内容不可读取。',
    createAnother: '再创建一条',
    reporting: '提交中...',
    underReview: '举报已提交。',
    createBurnLink: '创建归零链接',
    reportLink: '举报',
    reportReason: '举报类型',
    reportDetails: '补充说明',
    reportDetailsPlaceholder: '补充必要信息。',
    submitReport: '提交举报',
    reasons: {
      illegal: '违法内容',
      abuse: '滥用',
      spam: '垃圾内容',
      harassment: '骚扰',
      other: '其他'
    },
    expiryOptions: [
      ['300', '5分'],
      ['1800', '30分'],
      ['3600', '1时'],
      ['86400', '24时'],
      ['custom', '自定义']
    ],
    burnModeOptions: [
      ['view_limit', '按次数'],
      ['time_limit', '按时间'],
      ['time_and_view', '时间或次数']
    ],
    viewOptions: [
      ['1', '1'],
      ['3', '3'],
      ['5', '5'],
      ['10', '10'],
      ['custom', '自定义']
    ]
  },
  en: {
    navAdmin: 'Admin',
    langToggle: '中文',
    heroEyebrow: 'Private link. Zero after time.',
    heroTitle: 'Burn to Zero.',
    heroLede: 'Write once and send a link that only exists for a short while.',
    featureText: 'Private link',
    featureViews: 'Limited opens',
    featureExpiry: 'Timed zero',
    featureModerated: 'Unlisted',
    createEyebrow: 'Create',
    createTitle: 'Create Zero Link',
    composerNote: 'Zero Link: limited by time, opens, then 0.',
    contentType: 'Content type',
    contentText: 'Text',
    contentImage: 'Image',
    messageText: 'Message',
    textareaPlaceholder: 'Write what you want to send.',
    imageFile: 'Image',
    imagePlaceholder: 'Choose or paste a JPEG, PNG, WebP, or GIF image.',
    imagePasteLabel: 'Image picker, paste image supported',
    chooseImage: 'Choose image',
    removeImage: 'Remove',
    burnMode: 'Zero mode',
    expiry: 'Expiry',
    viewLimit: 'Open limit',
    customExpiryPlaceholder: 'Minutes, max 10080',
    customViewsPlaceholder: 'Opens, max 20',
    createButton: 'Create Zero Link',
    creating: 'Creating...',
    required: 'Message text is required.',
    imageRequired: 'Choose an image first.',
    imageTooLarge: (max) => `Image must be ${formatBytes(max)} or smaller.`,
    imageUnsupported: 'Only JPEG, PNG, WebP, and GIF images are supported.',
    verifyHuman: 'Verification',
    verificationRequired: 'Complete verification first.',
    verificationConfigError: 'Verification is not configured.',
    ready: 'Zero Link created.',
    burnsAfter: (message) => limitSummary(message),
    copy: 'Copy',
    copied: 'Copied',
    burnLink: 'Zero Link',
    opening: 'Opening.',
    openingCopy: 'Reading the link.',
    unavailable: 'Returned to zero.',
    cannotOpen: 'This link can no longer be opened.',
    openedEyebrow: 'Burn0 · Opened',
    openedTitle: 'Message content',
    openedImageTitle: 'Image content',
    openedLede: 'This content is only shown in this window and may not be readable again.',
    openedBurned: 'This link returned to zero after this open.',
    imageLoadError: 'Image cannot be read.',
    burnedTitle: 'Returned to zero',
    burnedCopy: 'No readable content remains here.',
    expiredCopy: 'Time ran out. The content returned to zero.',
    removedCopy: 'The content cannot be read here.',
    createAnother: 'Create another',
    reporting: 'Submitting...',
    underReview: 'Report submitted.',
    createBurnLink: 'Create Zero Link',
    reportLink: 'Report',
    reportReason: 'Report type',
    reportDetails: 'Details',
    reportDetailsPlaceholder: 'Add only what is needed.',
    submitReport: 'Submit report',
    reasons: {
      illegal: 'Illegal content',
      abuse: 'Abuse',
      spam: 'Spam',
      harassment: 'Harassment',
      other: 'Other'
    },
    expiryOptions: [
      ['300', '5m'],
      ['1800', '30m'],
      ['3600', '1h'],
      ['86400', '24h'],
      ['custom', 'Custom']
    ],
    burnModeOptions: [
      ['view_limit', 'Opens'],
      ['time_limit', 'Time'],
      ['time_and_view', 'Time or opens']
    ],
    viewOptions: [
      ['1', '1'],
      ['3', '3'],
      ['5', '5'],
      ['10', '10'],
      ['custom', 'Custom']
    ]
  }
};

route();
window.addEventListener('popstate', route);
document.addEventListener('click', (event) => {
  const adminTrigger = event.target.closest('[data-admin-trigger]');
  if (adminTrigger) {
    event.preventDefault();
    revealAdminAfterEightClicks();
    return;
  }

  const toggle = event.target.closest('[data-lang-toggle]');
  if (!toggle) {
    return;
  }

  language = language === 'zh' ? 'en' : 'zh';
  localStorage.setItem(LANG_KEY, language);
  route();
});

function revealAdminAfterEightClicks() {
  window.clearTimeout(adminTriggerTimer);
  adminTriggerCount += 1;

  if (adminTriggerCount >= 8) {
    adminTriggerCount = 0;
    window.history.pushState({}, '', '/admin/login');
    route();
    return;
  }

  adminTriggerTimer = window.setTimeout(() => {
    adminTriggerCount = 0;
  }, 3000);
}

async function route() {
  const path = window.location.pathname;

  if (path.startsWith('/admin')) {
    const admin = await import('/admin.js');
    admin.startAdmin(root);
    return;
  }

  if (path.startsWith('/m/')) {
    const id = decodeURIComponent(path.split('/')[2] || '');
    renderMessageRoute(id);
    return;
  }

  renderHome();
}

function renderHome() {
  const copy = t();
  resetTurnstileWidget();
  resetImagePreview();
  root.innerHTML = `
    <div class="site-shell">
      ${topbar()}
      <main class="hero">
        <section class="hero-copy" aria-labelledby="hero-title">
          <div class="burn-orbit" aria-hidden="true">
            <span class="zero-glyph">0</span>
          </div>
          <p class="eyebrow">${copy.heroEyebrow}</p>
          <h1 id="hero-title">${copy.heroTitle}</h1>
          <p class="hero-lede">${copy.heroLede}</p>
          <div class="feature-line" aria-label="Burn0 capabilities">
            <span>${icon('link', { size: 15 })}${copy.featureText}</span>
            <span>${icon('repeat', { size: 15 })}${copy.featureViews}</span>
            <span>${icon('clock', { size: 15 })}${copy.featureExpiry}</span>
            <span>${icon('eyeOff', { size: 15 })}${copy.featureModerated}</span>
          </div>
        </section>

        <section class="composer" aria-labelledby="create-title">
          <div class="field-row">
            <div>
              <p class="eyebrow">${copy.createEyebrow}</p>
              <h2 id="create-title" class="sr-only">${copy.createTitle}</h2>
            </div>
            <span class="meta">${copy.composerNote}</span>
          </div>

          <form id="createForm">
            <div class="field" id="contentTypeField" hidden>
              <span class="label">${copy.contentType}</span>
              <div class="segmented content-segmented" role="group" aria-label="${copy.contentType}">
                ${segment('contentType', 'text', copy.contentText, true)}
                ${segment('contentType', 'image', copy.contentImage)}
              </div>
            </div>

            <div class="field" id="textContentField">
              <div class="field-row">
                <label class="label" for="messageText">${copy.messageText}</label>
                <span class="counter" id="charCounter">0 / ${MAX_TEXT_LENGTH}</span>
              </div>
              <textarea id="messageText" maxlength="${MAX_TEXT_LENGTH}" spellcheck="true" autocomplete="off" placeholder="${copy.textareaPlaceholder}"></textarea>
            </div>

            <div class="field" id="imageContentField" hidden>
              <div class="field-row">
                <label class="label" for="imageFile">${copy.imageFile}</label>
                <span class="counter" id="imageCounter">${formatBytes(MAX_IMAGE_BYTES)}</span>
              </div>
              <input class="sr-only" id="imageFile" type="file" accept="${IMAGE_ACCEPT}">
              <div class="image-picker" id="imagePicker">
                <div class="image-preview is-empty" id="imagePreview" tabindex="0" aria-label="${copy.imagePasteLabel}">
                  <span>${copy.imagePlaceholder}</span>
                </div>
                <div class="action-row image-actions">
                  <label class="secondary-button" for="imageFile">${icon('upload')}<span class="btn-label">${copy.chooseImage}</span></label>
                  <button class="ghost-button" id="removeImage" type="button" disabled>${icon('x', { size: 16 })}<span class="btn-label">${copy.removeImage}</span></button>
                </div>
              </div>
            </div>

            <div class="field">
              <span class="label">${copy.burnMode}</span>
              <div class="segmented mode-segmented" role="group" aria-label="${copy.burnMode}">
                ${copy.burnModeOptions.map(([value, label], index) => segment('burnMode', value, label, index === 0)).join('')}
              </div>
            </div>

            <div class="control-grid" id="limitGrid">
              <div class="field" id="expiryField" hidden>
                <span class="label">${copy.expiry}</span>
                <div class="segmented" role="group" aria-label="${copy.expiry}">
                  ${copy.expiryOptions.map(([value, label], index) => segment('expiry', value, label, index === 0)).join('')}
                </div>
                <input id="customExpiry" type="number" min="1" max="10080" placeholder="${copy.customExpiryPlaceholder}" disabled>
              </div>

              <div class="field" id="viewsField">
                <span class="label">${copy.viewLimit}</span>
                <div class="segmented" role="group" aria-label="${copy.viewLimit}">
                  ${copy.viewOptions.map(([value, label], index) => segment('views', value, label, index === 0)).join('')}
                </div>
                <input id="customViews" type="number" min="1" max="20" placeholder="${copy.customViewsPlaceholder}" disabled>
              </div>
            </div>

            <div class="turnstile-field" id="turnstileField" hidden>
              <span class="label">${copy.verifyHuman}</span>
              <div class="turnstile-widget" id="turnstileWidget"></div>
            </div>

            <button class="primary-button" id="createButton" type="submit">${copy.createButton}</button>
            <div class="result" id="createResult" aria-live="polite"></div>
          </form>
        </section>
      </main>
    </div>
  `;

  bindComposer();
  initTurnstile();
}

function bindComposer() {
  const textArea = document.getElementById('messageText');
  const counter = document.getElementById('charCounter');
  const form = document.getElementById('createForm');

  textArea.focus();
  textArea.addEventListener('input', () => {
    counter.textContent = `${textArea.value.length} / ${MAX_TEXT_LENGTH}`;
  });

  bindSegments('expiry', 'customExpiry');
  bindSegments('views', 'customViews');
  bindBurnMode();
  bindContentType();
  bindImagePicker();
  initImageComposer();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await createMessage();
  });
}

function bindContentType() {
  const buttons = Array.from(document.querySelectorAll('[data-group="contentType"]'));
  const refresh = () => {
    const isImage = selectedContentType() === 'image';
    document.getElementById('textContentField').hidden = isImage;
    document.getElementById('imageContentField').hidden = !isImage;
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const item of buttons) {
        item.classList.toggle('is-active', item === button);
      }
      refresh();
    });
  }

  refresh();
}

function bindImagePicker() {
  const input = document.getElementById('imageFile');
  const remove = document.getElementById('removeImage');
  const picker = document.getElementById('imagePicker');
  if (!input || !remove || !picker) {
    return;
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0] || null;
    if (!file) {
      resetImagePreview();
      return;
    }
    updateImagePreview(file);
  });

  picker.addEventListener('paste', (event) => {
    const file = clipboardImageFile(event.clipboardData);
    if (!file) {
      return;
    }

    event.preventDefault();
    setImageInputFile(input, file);
    updateImagePreview(file);
  });

  remove.addEventListener('click', () => {
    input.value = '';
    resetImagePreview();
  });
}

async function initImageComposer() {
  const field = document.getElementById('contentTypeField');
  const counter = document.getElementById('imageCounter');
  if (!field || !counter) {
    return;
  }

  try {
    const config = await getPublicConfig();
    imageComposerConfig = {
      imageSharingEnabled: Boolean(config.imageSharingEnabled),
      maxImageBytes: Number(config.maxImageBytes || MAX_IMAGE_BYTES)
    };
  } catch (_error) {
    imageComposerConfig = { imageSharingEnabled: false, maxImageBytes: MAX_IMAGE_BYTES };
  }

  counter.textContent = formatBytes(imageComposerConfig.maxImageBytes);
  field.hidden = !imageComposerConfig.imageSharingEnabled;
}

function bindSegments(group, customInputId) {
  const buttons = Array.from(document.querySelectorAll(`[data-group="${group}"]`));
  const customInput = document.getElementById(customInputId);

  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const item of buttons) {
        item.classList.toggle('is-active', item === button);
      }
      customInput.disabled = button.dataset.value !== 'custom';
      if (!customInput.disabled) {
        customInput.focus();
      }
    });
  }
}

function bindBurnMode() {
  const buttons = Array.from(document.querySelectorAll('[data-group="burnMode"]'));
  const refresh = () => {
    const mode = selectedBurnMode();
    document.getElementById('limitGrid').classList.toggle('is-single', mode !== 'time_and_view');
    document.getElementById('expiryField').hidden = mode === 'view_limit';
    document.getElementById('viewsField').hidden = mode === 'time_limit';
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const item of buttons) {
        item.classList.toggle('is-active', item === button);
      }
      refresh();
    });
  }

  refresh();
}

async function createMessage() {
  const copy = t();
  const button = document.getElementById('createButton');
  const result = document.getElementById('createResult');
  const contentType = selectedContentType();
  const text = document.getElementById('messageText').value.trim();
  const imageFile = document.getElementById('imageFile')?.files?.[0] || null;
  const burnMode = selectedBurnMode();
  const payload = { text, burnMode };
  if (burnMode === 'time_limit' || burnMode === 'time_and_view') {
    payload.expiresInSeconds = selectedExpirySeconds();
  }
  if (burnMode === 'view_limit' || burnMode === 'time_and_view') {
    payload.maxViews = selectedNumber('views', 'customViews', 1, 1, 20);
  }

  if (contentType === 'text' && !text) {
    showResult(result, `<div class="notice is-danger">${copy.required}</div>`);
    return;
  }
  if (contentType === 'image') {
    const imageError = validateSelectedImage(imageFile);
    if (imageError) {
      showResult(result, `<div class="notice is-danger">${escapeHtml(imageError)}</div>`);
      return;
    }
  }

  const turnstileConfig = await getPublicConfig();
  const token = currentTurnstileToken();
  if (turnstileConfig.turnstileRequired && !token) {
    showResult(result, `<div class="notice is-danger">${copy.verificationRequired}</div>`);
    return;
  }

  button.disabled = true;
  button.textContent = copy.creating;

  try {
    const body = contentType === 'image'
      ? imageCreateForm(payload, imageFile, token)
      : JSON.stringify({ ...payload, turnstileToken: token });
    const response = await api('/api/messages', { method: 'POST', body });

    showResult(result, `
      <div class="notice">
        <strong>${copy.ready}</strong><br>
        ${copy.burnsAfter(response)}
      </div>
      <div class="share-row">
        <input id="shareUrl" readonly value="${escapeAttr(response.shareUrl)}">
        <button class="secondary-button" type="button" id="copyLink">${icon('copy')}<span class="btn-label">${copy.copy}</span></button>
      </div>
    `);

    document.getElementById('copyLink').addEventListener('click', async () => {
      await navigator.clipboard.writeText(response.shareUrl);
      document.getElementById('copyLink').innerHTML = `${icon('check')}<span class="btn-label">${copy.copied}</span>`;
    });
    if (contentType === 'image') {
      document.getElementById('imageFile').value = '';
      resetImagePreview();
    }
  } catch (error) {
    showResult(result, `<div class="notice is-danger">${escapeHtml(error.message)}</div>`);
  } finally {
    resetTurnstileChallenge();
    button.disabled = false;
    button.textContent = copy.createButton;
  }
}

async function renderMessageRoute(id) {
  const copy = t();
  root.innerHTML = `
    <div class="site-shell">
      ${topbar()}
      <main class="message-page">
        <section class="message-panel" id="messagePanel">
          <p class="eyebrow">${copy.burnLink}</p>
          <h1>${copy.opening}</h1>
          <p class="message-copy">${copy.openingCopy}</p>
        </section>
      </main>
    </div>
  `;

  const panel = document.getElementById('messagePanel');

  try {
    await openMessage(id, panel);
  } catch (error) {
    renderZeroState(panel, error.status || error.message || copy.cannotOpen);
  }
}

async function openMessage(id, panel) {
  const copy = t();

  try {
    const opened = await api(`/api/messages/${encodeURIComponent(id)}/open`, { method: 'POST' });
    renderOpenedMessage(panel, id, opened);
  } catch (error) {
    renderZeroState(panel, error.status || error.message);
  }
}

function renderOpenedMessage(panel, id, message) {
  const copy = t();
  const text = message.text || '';
  const isImage = message.contentType === 'image';
  panel.classList.add('opened-message');
  panel.innerHTML = `
    <div class="message-heading">
      <p class="eyebrow">${copy.openedEyebrow}</p>
      <p class="message-copy">${escapeHtml(openedMessageSummary(message))}</p>
    </div>
    ${isImage ? openedImage(message) : `<article class="message-body" aria-label="${copy.openedTitle}">${escapeHtml(text)}</article>`}
    <div class="action-row message-actions">
      <a class="secondary-button" href="/">${icon('plus')}<span class="btn-label">${copy.createAnother}</span></a>
      ${isImage ? '' : `<button class="secondary-button" type="button" id="copyMessage">${icon('copy')}<span class="btn-label">${copy.copy}</span></button>`}
      <button class="ghost-button" type="button" id="toggleReport">${icon('flag', { size: 16 })}<span class="btn-label">${copy.reportLink}</span></button>
    </div>
    ${reportBox(id)}
  `;
  bindCopyMessage(panel, text);
  bindOpenedImage(panel);
  bindReport(panel, id);
}

function openedImage(message) {
  const copy = t();
  const url = message.image?.url || '';
  return `
    <figure class="message-image-frame">
      <img src="${escapeAttr(url)}" alt="${escapeAttr(copy.openedImageTitle)}">
      <figcaption class="meta">${escapeHtml(message.image?.mimeType || '')} · ${formatBytes(message.image?.size || 0)}</figcaption>
    </figure>
  `;
}

function bindOpenedImage(panel) {
  const copy = t();
  const image = panel.querySelector('.message-image-frame img');
  if (!image) {
    return;
  }

  image.addEventListener('error', () => {
    const frame = image.closest('.message-image-frame');
    frame.innerHTML = `<div class="notice is-danger">${copy.imageLoadError}</div>`;
  });
}

function bindReport(panel, id) {
  const copy = t();
  const toggle = panel.querySelector('#toggleReport');
  const report = panel.querySelector('#reportBox');
  const form = panel.querySelector('#reportForm');

  if (!toggle || !report || !form) {
    return;
  }

  toggle.addEventListener('click', () => report.classList.toggle('is-visible'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = copy.reporting;

    try {
      await api(`/api/messages/${encodeURIComponent(id)}/report`, {
        method: 'POST',
        body: JSON.stringify({
          reason: form.reason.value,
          details: form.details.value
        })
      });
      report.innerHTML = `<div class="notice">${copy.underReview}</div>`;
    } catch (error) {
      report.insertAdjacentHTML('beforeend', `<div class="notice is-danger">${escapeHtml(error.message)}</div>`);
    } finally {
      submit.disabled = false;
      submit.textContent = copy.submitReport;
    }
  });
}

function bindCopyMessage(panel, text) {
  const copy = t();
  const button = panel.querySelector('#copyMessage');
  if (!button) {
    return;
  }

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      button.innerHTML = `${icon('check')}<span class="btn-label">${copy.copied}</span>`;
      window.setTimeout(() => {
        button.innerHTML = `${icon('copy')}<span class="btn-label">${copy.copy}</span>`;
      }, 2000);
    } catch (_error) {
      // 剪贴板不可用时（如非安全上下文）保持按钮可用，不打断阅读
    }
  });
}

function renderZeroState(panel, status) {
  const copy = t();
  const detail = zeroStateCopy(status);
  panel.innerHTML = `
    <div class="zero-page">
      <div class="zero-state">
        ${zeroMark()}
        <p class="eyebrow">Burn0</p>
        <h1>${copy.burnedTitle}</h1>
        <p class="message-copy">${escapeHtml(detail)}</p>
      </div>
      <div class="action-row zero-actions">
        <a class="secondary-button" href="/">${copy.createBurnLink}</a>
      </div>
    </div>
  `;
}

function zeroStateCopy(status) {
  const copy = t();
  const value = String(status || '').toLowerCase();
  if (value.includes('expired')) {
    return copy.expiredCopy;
  }
  if (value.includes('deleted') || value.includes('quarantined') || value.includes('removed')) {
    return copy.removedCopy;
  }
  if (value.includes('not_found')) {
    return copy.cannotOpen;
  }
  return copy.burnedCopy;
}

function zeroMark() {
  return `
    <div class="zero-mark" aria-hidden="true">
      <span class="zero-digit">0</span>
    </div>
  `;
}

function reportBox(id) {
  const copy = t();
  return `
    <div class="report-box" id="reportBox">
      <form id="reportForm">
        <div class="field">
          <label class="label" for="reportReason-${escapeAttr(id)}">${copy.reportReason}</label>
          <select id="reportReason-${escapeAttr(id)}" name="reason">
            <option value="illegal">${copy.reasons.illegal}</option>
            <option value="abuse">${copy.reasons.abuse}</option>
            <option value="spam">${copy.reasons.spam}</option>
            <option value="harassment">${copy.reasons.harassment}</option>
            <option value="other">${copy.reasons.other}</option>
          </select>
        </div>
        <div class="field">
          <label class="label" for="reportDetails-${escapeAttr(id)}">${copy.reportDetails}</label>
          <textarea id="reportDetails-${escapeAttr(id)}" name="details" placeholder="${copy.reportDetailsPlaceholder}"></textarea>
        </div>
        <button class="secondary-button" type="submit">${copy.submitReport}</button>
      </form>
    </div>
  `;
}

function topbar() {
  const copy = t();
  return `
    <header class="topbar">
      <a class="brand" href="/" aria-label="Burn0 home">
        ${brandMark()}
        <span>Burn0</span>
      </a>
      <div class="top-actions">
        <button class="nav-link lang-toggle" type="button" data-lang-toggle>${copy.langToggle}</button>
      </div>
    </header>
  `;
}

function brandMark() {
  return `
    <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true" data-admin-trigger>
      <path class="brand-zero" d="M51.7 35.5A20 20 0 1 1 41.2 14.1"/>
      <path class="brand-ember" d="M47.3 19.1A20 20 0 0 1 51.7 35.5"/>
    </svg>
  `;
}

function segment(group, value, label, active = false) {
  return `<button class="segment${active ? ' is-active' : ''}" type="button" data-group="${group}" data-value="${value}">${label}</button>`;
}

function t() {
  return USER_COPY[language] || USER_COPY.zh;
}

function selectedBurnMode() {
  const active = document.querySelector('[data-group="burnMode"].is-active');
  return active?.dataset.value || 'view_limit';
}

function selectedContentType() {
  if (!imageComposerConfig.imageSharingEnabled) {
    return 'text';
  }
  const active = document.querySelector('[data-group="contentType"].is-active');
  return active?.dataset.value === 'image' ? 'image' : 'text';
}

function validateSelectedImage(file) {
  const copy = t();
  if (!file) {
    return copy.imageRequired;
  }

  if (file.size > imageComposerConfig.maxImageBytes) {
    return copy.imageTooLarge(imageComposerConfig.maxImageBytes);
  }

  if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
    return copy.imageUnsupported;
  }

  return '';
}

function clipboardImageFile(clipboardData) {
  const files = Array.from(clipboardData?.files || []);
  const directFile = files.find((file) => file.type?.startsWith('image/'));
  if (directFile) {
    return namedClipboardImageFile(directFile);
  }

  const items = Array.from(clipboardData?.items || []);
  const imageItem = items.find((item) => item.kind === 'file' && item.type?.startsWith('image/'));
  const itemFile = imageItem?.getAsFile();
  return itemFile ? namedClipboardImageFile(itemFile) : null;
}

function namedClipboardImageFile(file) {
  if (file.name) {
    return file;
  }

  const extension = imageExtension(file.type);
  return new File([file], `pasted-image-${Date.now()}.${extension}`, {
    type: file.type,
    lastModified: file.lastModified || Date.now()
  });
}

function imageExtension(mimeType) {
  return {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  }[mimeType] || 'bin';
}

function setImageInputFile(input, file) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}

function imageCreateForm(payload, file, token) {
  const form = new FormData();
  form.append('contentType', 'image');
  form.append('burnMode', payload.burnMode);
  if (payload.expiresInSeconds) {
    form.append('expiresInSeconds', String(payload.expiresInSeconds));
  }
  if (payload.maxViews) {
    form.append('maxViews', String(payload.maxViews));
  }
  if (token) {
    form.append('turnstileToken', token);
  }
  form.append('image', file);
  return form;
}

function updateImagePreview(file) {
  const preview = document.getElementById('imagePreview');
  const remove = document.getElementById('removeImage');
  if (!preview || !remove) {
    return;
  }

  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
  }
  imagePreviewUrl = URL.createObjectURL(file);
  preview.classList.remove('is-empty');
  preview.innerHTML = `
    <img src="${escapeAttr(imagePreviewUrl)}" alt="">
    <span>${escapeHtml(file.name)} · ${formatBytes(file.size)}</span>
  `;
  remove.disabled = false;
}

function resetImagePreview() {
  const copy = t();
  const preview = document.getElementById('imagePreview');
  const remove = document.getElementById('removeImage');
  if (imagePreviewUrl) {
    URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = '';
  }
  if (preview) {
    preview.classList.add('is-empty');
    preview.innerHTML = `<span>${copy.imagePlaceholder}</span>`;
  }
  if (remove) {
    remove.disabled = true;
  }
}

function selectedExpirySeconds() {
  const expiryValue = selectedRawValue('expiry', 'customExpiry');
  return expiryValue.isCustom
    ? clampNumber(Number.parseInt(expiryValue.value, 10) * 60, 60, 7 * 24 * 60 * 60, 300)
    : clampNumber(Number.parseInt(expiryValue.value, 10), 60, 7 * 24 * 60 * 60, 300);
}

function selectedNumber(group, customInputId, fallback, min, max) {
  const selected = selectedRawValue(group, customInputId);
  const parsed = Number.parseInt(selected.value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function selectedRawValue(group, customInputId) {
  const active = document.querySelector(`[data-group="${group}"].is-active`);
  if (!active) {
    return { value: '', isCustom: false };
  }

  const isCustom = active.dataset.value === 'custom';
  return {
    value: isCustom ? document.getElementById(customInputId).value : active.dataset.value,
    isCustom
  };
}

function clampNumber(value, min, max, fallback) {
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function limitSummary(message) {
  const copy = t();
  if (message.burnMode === 'view_limit') {
    return language === 'zh'
      ? `${message.maxViews} 次打开后归零。`
      : `Returns to zero after ${message.maxViews} open${message.maxViews === 1 ? '' : 's'}.`;
  }

  if (message.burnMode === 'time_limit') {
    return language === 'zh'
      ? `到达过期时间后归零。`
      : 'Returns to zero at expiry.';
  }

  if (message.burnMode === 'time_and_view') {
    return language === 'zh'
      ? `${message.maxViews} 次打开或到达过期时间后归零。`
      : `Returns to zero after ${message.maxViews} open${message.maxViews === 1 ? '' : 's'} or at expiry, whichever comes first.`;
  }

  return copy.burnedCopy;
}

function openedMessageSummary(message) {
  const copy = t();
  if (message.burned) {
    return copy.openedBurned;
  }

  return copy.openedLede;
}

async function getPublicConfig() {
  if (!publicConfigPromise) {
    publicConfigPromise = api('/api/public-config');
  }

  return await publicConfigPromise;
}

async function initTurnstile() {
  const copy = t();
  const field = document.getElementById('turnstileField');
  const container = document.getElementById('turnstileWidget');
  if (!field || !container) {
    return;
  }

  let config;
  try {
    config = await getPublicConfig();
  } catch (_error) {
    field.hidden = false;
    container.innerHTML = `<div class="notice is-danger">${copy.verificationConfigError}</div>`;
    return;
  }

  if (!config.turnstileSiteKey) {
    if (config.turnstileRequired) {
      field.hidden = false;
      container.innerHTML = `<div class="notice is-danger">${copy.verificationConfigError}</div>`;
    }
    return;
  }

  field.hidden = false;
  let turnstile;
  try {
    turnstile = await loadTurnstileScript();
  } catch (_error) {
    container.innerHTML = `<div class="notice is-danger">${copy.verificationConfigError}</div>`;
    return;
  }

  if (!document.getElementById('turnstileWidget') || turnstileWidgetId !== null) {
    return;
  }

  turnstileWidgetId = turnstile.render('#turnstileWidget', {
    sitekey: config.turnstileSiteKey,
    theme: 'dark',
    size: 'flexible',
    language: language === 'zh' ? 'zh-cn' : 'en',
    callback: (token) => {
      turnstileToken = token;
    },
    'expired-callback': () => {
      turnstileToken = '';
    },
    'error-callback': () => {
      turnstileToken = '';
    },
    'timeout-callback': () => {
      turnstileToken = '';
    }
  });
}

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('[data-turnstile-script]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.addEventListener('load', () => resolve(window.turnstile), { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  return turnstileScriptPromise;
}

function currentTurnstileToken() {
  if (turnstileToken) {
    return turnstileToken;
  }

  if (window.turnstile && typeof window.turnstile.getResponse === 'function' && turnstileWidgetId !== null) {
    return window.turnstile.getResponse(turnstileWidgetId) || '';
  }

  return '';
}

function resetTurnstileChallenge() {
  turnstileToken = '';
  if (window.turnstile && typeof window.turnstile.reset === 'function' && turnstileWidgetId !== null) {
    window.turnstile.reset(turnstileWidgetId);
  }
}

function resetTurnstileWidget() {
  turnstileToken = '';
  if (window.turnstile && typeof window.turnstile.remove === 'function' && turnstileWidgetId !== null) {
    window.turnstile.remove(turnstileWidgetId);
  }
  turnstileWidgetId = null;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(path, {
    ...options,
    headers
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || payload.copy || 'Request failed.');
    error.status = payload.status || payload.code || '';
    throw error;
  }

  return payload;
}

function showResult(element, html) {
  // 内容包一层 inner 容器，配合 CSS 的 grid-template-rows 过渡平滑展开，避免生成后页面骤然撑高
  element.innerHTML = `<div class="result-inner">${html}</div>`;
  // 强制下一帧再加 is-visible，确保从折叠态过渡而非瞬间出现
  requestAnimationFrame(() => element.classList.add('is-visible'));
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
