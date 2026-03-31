export const WEBSITE_MODES = ['always', 'random', 'counter'];

export function normalizeWebsiteRedirectFromDb(d) {
  if (!d || typeof d !== 'object') {
    return {
      enabled: false,
      url: '',
      every_click: true,
      mode: 'always',
      click_rate: '',
      click_frequency: '',
    };
  }
  const url = d.url ?? d.redirect_url ?? d.redirectUrl ?? d.website_url ?? d.link ?? '';
  const enabled = !!d.enabled;
  const mode = WEBSITE_MODES.includes(d.mode) ? d.mode : 'always';
  const every_click =
    d.every_click !== undefined && d.every_click !== null ? !!d.every_click : enabled;
  const click_rate =
    d.click_rate != null
      ? Number(d.click_rate)
      : d.randomChance != null
        ? Number(d.randomChance)
        : '';
  const click_frequency =
    d.click_frequency != null
      ? Number(d.click_frequency)
      : d.clickFrequency != null
        ? Number(d.clickFrequency)
        : '';
  return { enabled, url, every_click, mode, click_rate, click_frequency };
}

export function validateWebsiteRedirectUrl(urlStr) {
  const t = (urlStr || '').trim();
  if (!t) return 'Inserisci un URL o un dominio.';
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname) return 'URL non valido.';
    return null;
  } catch {
    return 'URL non valido.';
  }
}

export function validateWebsiteRedirectForm(form) {
  const errs = {};
  if (form.enabled) {
    const u = validateWebsiteRedirectUrl(form.url);
    if (u) errs.url = u;
  }
  if (form.mode === 'random' && !form.every_click) {
    const n = form.click_rate === '' ? NaN : Number(form.click_rate);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      errs.click_rate = 'Inserisci un numero tra 0 e 100.';
    }
  }
  if (form.mode === 'counter' && !form.every_click) {
    const raw = form.click_frequency === '' ? '' : String(form.click_frequency).trim();
    const n = raw === '' ? NaN : parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || String(n) !== raw) {
      errs.click_frequency = 'Inserisci un intero ≥ 1.';
    }
  }
  return errs;
}

export function buildWebsiteRedirectPayload(form) {
  const url = (form.url || '').trim();
  const payload = {
    enabled: !!form.enabled,
    url,
    every_click: !!form.every_click,
    mode: form.mode,
  };
  if (form.mode === 'random' && !form.every_click) {
    payload.click_rate = Number(form.click_rate);
  }
  if (form.mode === 'counter' && !form.every_click) {
    payload.click_frequency = parseInt(String(form.click_frequency).trim(), 10);
  }
  return payload;
}
