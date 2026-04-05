const BASE = 'https://growth.didiglobal.com/litchi2/api';
const SMS_BASE =
  'https://gungnir.xiaojukeji.com/data-ingestion/api/rabbit_page';
const GIFT_BASE = 'https://www.udache.com/gtapi/rosenbridge/giftpackage';
const FETCH_TIMEOUT_MS = 15000;

const $ = (id) => document.getElementById(id);

function buildCityIndex() {
  const idx = {};
  CITIES.forEach((group) => {
    group.cities.forEach((c) => {
      idx[group.country + ':' + c.cityId] = { ...c, country: group.country };
    });
  });
  return idx;
}
const cityIndex = buildCityIndex();


function populateCountrySelect() {
  const sel = $('countrySelect');
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '';
  blank.hidden = true;
  sel.appendChild(blank);
  CITIES.forEach((group) => {
    const opt = document.createElement('option');
    opt.value = group.country;
    opt.textContent = group.countryName;
    sel.appendChild(opt);
  });
}
populateCountrySelect();

function populateCitySelect(countryCode) {
  const sel = $('citySelect');
  sel.innerHTML = '';
  const group = CITIES.find((g) => g.country === countryCode);
  if (group) {
    const tiers = {};
    group.cities.forEach((c) => {
      (tiers[c.discount] ||= []).push(c);
    });
    for (const [discount, cities] of Object.entries(tiers)) {
      const og = document.createElement('optgroup');
      og.label = discount;
      cities.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = group.country + ':' + c.cityId;
        opt.textContent = c.name;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    }
  }
}

function applyCitySelection() {
  const val = $('citySelect').value;
  const city = cityIndex[val];
  if (!city) return;
  $('cityId').value = city.cityId;
  $('countyId').value = city.countyId;
  $('activityId').value = city.activityId;
  $('activityType').value = city.activityType;
  $('countryCode').value = city.country;
  $('cityDiscount').textContent = city.discount;
  $('cityReferrer').textContent = city.referrer;
  $('cityInfoDiscount').style.display = '';
  $('cityInfoReferrer').style.display = '';
}

function applyOtpModeToggle() {
  const otp = isOtpMode();
  const group = getSelectedCountryGroup();

  $('otpCard').style.display = otp ? '' : 'none';
  $('uidCard').style.display = otp ? 'none' : '';

  if (otp && group.callingCode && !$('countryCallingCode').value.trim()) {
    $('countryCallingCode').value = group.callingCode.replace(/^\+/, '');
  }
}

$('countrySelect').addEventListener('change', () => {
  populateCitySelect($('countrySelect').value);
  applyCitySelection();
  applyOtpModeToggle();
});

$('countrySelect').value = 'AU';
populateCitySelect('AU');
$('citySelect').value = 'AU:61050200';
applyCitySelection();

$('citySelect').addEventListener('change', applyCitySelection);

function applyManualEntryToggle() {
  const isManual = $('manualEntryToggle').checked;
  $('countryCityCard').style.display = isManual ? 'none' : '';
  $('manualFields').style.display = isManual ? '' : 'none';
}

$('manualEntryToggle').addEventListener('change', applyManualEntryToggle);
applyManualEntryToggle();

document.querySelectorAll('.container input, .container select').forEach((el) => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('claimBtn').disabled) $('claimBtn').click();
  });
});

function getCommon(uid) {
  const activityId = $('activityId').value.trim();
  return {
    a: activityId,
    activity_id: activityId,
    city_id: Number($('cityId').value),
    country_code: $('countryCode').value.trim(),
    county_id: Number($('countyId').value),
    uid: Number(uid),
    location_cityid: 0,
    mock: false,
    mock_by_key: false,
  };
}

function parseUidList() {
  return $('uid')
    .value.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function randomUid() {
  const base = 369436900000000n;
  const range = 200000000n;
  const rand = BigInt(Math.floor(Math.random() * Number(range)));
  return (base + rand).toString();
}

async function post(endpoint, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function generateXoid() {
  return crypto.randomUUID();
}

function getOtpTrackingParams(campaign) {
  return {
    xbiz: '',
    prod_key: campaign.prodKey,
    xpsid: campaign.xpsid,
    dchn: campaign.dchn,
    xoid: generateXoid(),
    xenv: 'h5',
    xspm_from: '',
    xpsid_root: campaign.xpsid,
    xpsid_from: '',
    xpsid_share: '',
  };
}

async function postOtp(url, body, extraHeaders = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        json?.errmsg || json?.message || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendSmsCode(phone, callingCode, lang, campaign) {
  const body = {
    ...getOtpTrackingParams(campaign),
    country_code: callingCode,
    phone,
    lang,
  };
  return postOtp(`${SMS_BASE}/send_sms_code`, body);
}

async function claimGiftPackage(phone, callingCode, otp, campaign) {
  const body = {
    ...getOtpTrackingParams(campaign),
    canvas_id: campaign.canvasId,
    query_version: 'v2',
    country_calling_code: callingCode,
    cell: phone,
    verification_code: otp,
    extra: {
      env: {
        dchn: campaign.dchn,
        userAgent: navigator.userAgent,
        fromChannel: '8',
        newAppid: '30004',
        isHitButton: true,
        isOpenWeb: true,
        timeCost: 0,
        isPaste: false,
        xenv: 'h5',
      },
    },
    url: window.location.href,
  };
  return postOtp(`${GIFT_BASE}/detail?nginx_cors=false`, body, {
    'secdd-challenge': '4|v1.1.0||||||',
    'secdd-authentication': String(Math.floor(Date.now() / 1000)),
  });
}

function getSelectedCountryGroup() {
  const code = $('countrySelect').value;
  return CITIES.find((g) => g.country === code) || null;
}

function isOtpMode() {
  const group = getSelectedCountryGroup();
  return group?.otp === true;
}


$('sendCodeBtn').addEventListener('click', async () => {
  const cell = $('cell').value.trim();
  if (!cell) {
    $('cell').focus();
    return;
  }
  const group = getSelectedCountryGroup();
  if (!group?.otp) return;

  const btn = $('sendCodeBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const callingCode = '+' + $('countryCallingCode').value.trim();
    const res = await sendSmsCode(
      cell,
      callingCode,
      group.lang,
      group.campaign,
    );
    if (res.errno !== 0) {
      btn.textContent = 'Send Code';
      btn.disabled = false;
      showResult(false, res.errmsg || 'Failed to send SMS code', '', { sms: res });
      return;
    }
    btn.textContent = 'Sent!';
    btn.disabled = true;
    $('otpCode').focus();
    setTimeout(() => {
      btn.textContent = 'Send Code';
      btn.disabled = false;
    }, 2000);
    $('progress').style.display = 'none';
    showResult(true, 'SMS sent', '', { sms: res });
  } catch (err) {
    btn.textContent = 'Send Code';
    btn.disabled = false;
    showResult(false, err.message || 'Failed to send SMS code', '', {});
  }
});

function setStep(id, state) {
  const el = $(id);
  el.className = 'step ' + state;
}

function showResult(level, message, bodyHtml, rawData) {
  const card = $('resultCard');
  const header = $('resultHeader');
  const badge = $('resultBadge');
  const msg = $('resultMsg');
  const body = $('resultBody');

  const labels = {
    success: 'Success',
    warning: 'Already Claimed',
    error: 'Error',
  };
  const cls = level === true ? 'success' : level === false ? 'error' : level;

  card.classList.add('show');
  header.className = 'result-header ' + cls;
  badge.className = 'badge ' + cls;
  badge.textContent = labels[cls] || cls;
  msg.textContent = message;

  body.innerHTML = bodyHtml;

  const toggleButton = document.createElement('button');
  toggleButton.className = 'raw-toggle';
  toggleButton.textContent = 'Toggle Raw JSON';

  const rawDiv = document.createElement('div');
  rawDiv.className = 'raw-json';
  rawDiv.textContent = JSON.stringify(rawData, null, 2);

  toggleButton.addEventListener('click', () => rawDiv.classList.toggle('show'));

  body.appendChild(toggleButton);
  body.appendChild(rawDiv);
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tzOffsetMs(tz) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  let h = get('hour');
  if (h === 24) h = 0;
  const localMs = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    h,
    get('minute'),
    get('second'),
  );
  return localMs - now.getTime();
}

function parseRewardTimeMs(str, tz) {
  if (!str) return null;
  const m = str.match(
    /^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)$/i,
  );
  if (!m) return null;
  let [, dd, mm, yyyy, h, min, sec, ap] = m;
  h = Number(h);
  if (ap.toLowerCase() === 'pm' && h !== 12) h += 12;
  if (ap.toLowerCase() === 'am' && h === 12) h = 0;
  const asUtcMs = Date.UTC(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    h,
    Number(min),
    Number(sec),
  );
  if (!tz) return asUtcMs;
  return asUtcMs - tzOffsetMs(tz);
}

function isRecentClaim(rewardTimeStr, tz) {
  const claimUtcMs = parseRewardTimeMs(rewardTimeStr, tz);
  if (claimUtcMs == null) return true;
  return Math.abs(Date.now() - claimUtcMs) < 5 * 60 * 1000;
}

let isClaiming = false;

async function claimOtp() {
  const cell = $('cell').value.trim();
  const otp = $('otpCode').value.trim();
  const group = getSelectedCountryGroup();

  if (!cell) {
    $('cell').focus();
    return;
  }
  if (!otp) {
    $('otpCode').focus();
    return;
  }

  isClaiming = true;
  const claimBtn = $('claimBtn');
  claimBtn.disabled = true;
  claimBtn.classList.add('loading');
  claimBtn.textContent = 'Claiming...';

  $('resultCard').classList.remove('show');
  $('progress').style.display = 'block';
  $('stepOtp').style.display = '';
  $('step2').style.display = 'none';
  $('step3').style.display = 'none';
  setStep('stepOtp', 'active');

  $('stepOtp').querySelector('.dot').nextSibling.textContent =
    ' Claiming gift package...';

  const allResponses = {};

  try {
    const callingCode = '+' + $('countryCallingCode').value.trim();
    const res = await claimGiftPackage(
      cell,
      callingCode,
      otp,
      group.campaign,
    );
    allResponses.claim = res;

    if (res.errno !== 0) {
      setStep('stepOtp', 'fail');
      showResult(false, res.errmsg || `Error ${res.errno}`, '', allResponses);
      return;
    }

    setStep('stepOtp', 'done');
    const freshPkg = res.data?.reward_info?.channel_gift_package;
    const historyPkg = res.data?.reward_history_list?.channel_gift_package;
    const alreadyClaimed = !freshPkg && !!historyPkg;
    const pkg = freshPkg || historyPkg;
    const coupons = pkg?.coupon || [];
    const receivedMsg = pkg?.received_msg || '';
    let html = '';
    if (receivedMsg) {
      html += `<div class="join-info"><div class="info-row"><span>${escHtml(receivedMsg)}</span></div></div>`;
    }
    if (coupons.length === 0) {
      html +=
        '<div class="reward-item"><div class="reward-row"><span class="reward-label">Info</span><span class="reward-value">No coupons returned</span></div></div>';
    } else {
      coupons.forEach((c, i) => {
        const amt = (c.amount / 100).toFixed(0);
        const cap = c.cap ? (c.cap / 100).toFixed(0) : null;
        const rules = (c.showrule || [])
          .map(
            (r) =>
              `<div class="reward-row"><span class="reward-label">${escHtml(r.show_rule_name)}</span><span class="reward-value">${escHtml(r.show_rule_values)}</span></div>`,
          )
          .join('');
        html += `
          <div class="reward-item">
            <div class="reward-row">
              <span class="reward-label">Coupon ${coupons.length > 1 ? '#' + (i + 1) : ''}</span>
              <span class="reward-value highlight">HK$${escHtml(amt)} off</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Name</span>
              <span class="reward-value">${escHtml(c.name || '-')}</span>
            </div>
            ${cap ? `<div class="reward-row"><span class="reward-label">Min Order</span><span class="reward-value">HK$${escHtml(cap)}</span></div>` : ''}
            <div class="reward-row">
              <span class="reward-label">Expires</span>
              <span class="reward-value">${escHtml(c.expire_time || '-')}</span>
            </div>
            ${c.remark ? `<div class="reward-row"><span class="reward-label">Note</span><span class="reward-value">${escHtml(c.remark)}</span></div>` : ''}
            ${rules}
          </div>`;
      });
    }
    showResult(
      alreadyClaimed ? 'warning' : true,
      alreadyClaimed ? 'Already claimed' : 'Gift package claimed',
      html,
      allResponses,
    );
  } catch (err) {
    if (err.body) allResponses.errorBody = err.body;
    setStep('stepOtp', 'fail');
    showResult(false, err.message || 'Network error', '', allResponses);
  } finally {
    isClaiming = false;
    claimBtn.disabled = false;
    claimBtn.classList.remove('loading');
    claimBtn.textContent = 'Claim Discount';
  }
}

async function claimReferral() {
  const cell = $('cell').value.trim();
  if (!cell) {
    $('cell').focus();
    return;
  }

  const callingCode = '+' + $('countryCallingCode').value.trim();
  const actType = Number($('activityType').value);
  const tcIds = $('tcIdList')
    .value.split(',')
    .map((s) => Number(s.trim()))
    .filter(Boolean);
  const selectedCity = cityIndex[$('citySelect').value];
  const cityTz = selectedCity?.tz || null;

  isClaiming = true;
  const claimBtn = $('claimBtn');
  claimBtn.disabled = true;
  claimBtn.classList.add('loading');
  claimBtn.textContent = 'Claiming...';

  $('resultCard').classList.remove('show');
  $('progress').style.display = 'block';
  $('stepOtp').style.display = 'none';
  $('step2').style.display = '';
  $('step3').style.display = '';
  $('step2').querySelector('.dot').nextSibling.textContent =
    ' Joining referral...';
  $('step3').querySelector('.dot').nextSibling.textContent =
    ' Fetching rewards...';
  setStep('step2', 'active');
  setStep('step3', '');

  const allResponses = {};

  try {
    const uidList = parseUidList();
    const useRandomFallback = $('randomUidToggle').checked;
    const MAX_RETRIES = Math.max(
      uidList.length,
      useRandomFallback ? 3 : uidList.length,
    );

    let joinRes,
      signRes,
      currentUid = uidList[0] || randomUid(),
      attempt = 0;
    while (true) {
      attempt++;

      signRes = await post('/tc/sign', {
        ...getCommon(currentUid),
        user_type: 0,
        tc_id_list: tcIds,
        cell,
        country_calling_code: callingCode,
        activity_type: actType,
      });
      allResponses['sign_attempt_' + attempt] = signRes;

      if (signRes.errno !== 0) {
        setStep('step2', 'fail');
        showResult(
          false,
          signRes.errmsg || 'T&C sign failed',
          '',
          allResponses,
        );
        return;
      }
      joinRes = await post('/component/join', {
        ...getCommon(currentUid),
        user_type: 1,
        cell,
        country_calling_code: callingCode,
        activity_type: actType,
      });
      allResponses['join_attempt_' + attempt] = joinRes;

      if (
        joinRes.business_code === 'USER_RISK_FORBIDDEN' &&
        attempt <= MAX_RETRIES
      ) {
        if (attempt < uidList.length) {
          currentUid = uidList[attempt];
        } else if (useRandomFallback) {
          currentUid = randomUid();
        } else {
          break;
        }
        const source = attempt < uidList.length ? 'list' : 'random';
        $('step2').querySelector('.dot').nextSibling.textContent =
          ` Joining referral... (retry ${attempt}/${MAX_RETRIES}, ${source} UID: ${currentUid})`;
        continue;
      }
      break;
    }
    allResponses.sign = signRes;
    allResponses.join = joinRes;

    if (joinRes.errno !== 0) {
      setStep('step2', 'fail');
      showResult(false, joinRes.errmsg || 'Join failed', '', allResponses);
      return;
    }
    setStep('step2', 'done');

    const joinData = joinRes.data || {};
    const refereeUid = joinData.referee_uid || currentUid;

    setStep('step3', 'active');
    const rewardBody = {
      ...getCommon(currentUid),
      uid: refereeUid,
      user_type: 0,
      component_package_list: ['pkg_reward_list'],
      activity_type: actType,
      reward_type: 0,
      country_calling_code: callingCode,
      cell,
      page_num: 0,
      page_size: 20,
    };
    const rewardRes = await post('/referral_component', rewardBody);
    allResponses.referral = rewardRes;

    if (rewardRes.errno !== 0) {
      setStep('step3', 'fail');
      showResult(
        false,
        rewardRes.errmsg || 'Reward fetch failed',
        buildJoinHtml(joinData, [], currentUid),
        allResponses,
      );
      return;
    }
    setStep('step3', 'done');

    const rewards =
      rewardRes.data?.pkg_reward_list?.com_reward_list?.data?.reward_list || [];
    let html = buildJoinHtml(joinData, rewards, currentUid);

    if (rewards.length === 0) {
      html +=
        '<div class="reward-item"><div class="reward-row"><span class="reward-label">Info</span><span class="reward-value">No rewards returned</span></div></div>';
    } else {
      rewards.forEach((r, i) => {
        const amt =
          r.reward_amount_localize?.[3] || (r.reward_amount / 100).toFixed(2);
        html += `
          <div class="reward-item">
            <div class="reward-row">
              <span class="reward-label">Reward ${rewards.length > 1 ? '#' + (i + 1) : ''}</span>
              <span class="reward-value highlight">${escHtml(String(amt))}</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Activity</span>
              <span class="reward-value">${escHtml(r.activity_name || '-')}</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Name</span>
              <span class="reward-value">${escHtml(r.reward_name || '-')}</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Discount</span>
              <span class="reward-value">${r.discount != null ? r.discount + '%' : '-'}</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Coupon Type</span>
              <span class="reward-value">${r.coupon_type ?? '-'}</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Expires</span>
              <span class="reward-value">${escHtml(r.reward_expire_time || '-')}</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Claimed</span>
              <span class="reward-value">${escHtml(r.reward_get_time || '-')}</span>
            </div>
          </div>`;
      });
    }

    const joinOk =
      joinRes.business_code === 'SUCCESS' ||
      joinRes.business_code === 'UNDEFINED';
    const hasRewards = rewards.length > 0;

    let alreadyClaimed = false;
    if (joinOk && hasRewards) {
      alreadyClaimed = !isRecentClaim(rewards[0].reward_get_time, cityTz);
    }

    let level, statusText;
    if (!joinOk) {
      level = false;
      statusText = joinRes.business_code || 'Unknown error';
      setStep('step2', 'fail');
    } else if (!hasRewards) {
      level = false;
      statusText = 'No rewards returned';
      setStep('step3', 'fail');
    } else if (alreadyClaimed) {
      level = 'warning';
      statusText = 'Referral was already claimed';
    } else {
      level = true;
      statusText = 'Referral claimed';
    }

    showResult(level, statusText, html, allResponses);
  } catch (err) {
    ['step2', 'step3'].forEach((s) => {
      if ($(s).classList.contains('active')) setStep(s, 'fail');
    });
    showResult(false, err.message || 'Network error', '', allResponses);
  } finally {
    isClaiming = false;
    const claimBtn = $('claimBtn');
    claimBtn.disabled = false;
    claimBtn.classList.remove('loading');
    claimBtn.textContent = 'Claim Discount';
  }
}

$('claimBtn').addEventListener('click', async () => {
  if (isClaiming) return;
  if (isOtpMode()) {
    await claimOtp();
  } else {
    await claimReferral();
  }
});

function buildJoinHtml(joinData, rewards, referrerUid) {
  if (!joinData || Object.keys(joinData).length === 0) return '';
  const referrerView = rewards?.[0]?.reward_referees?.[0]?.referee_view;
  const rows = [
    ['Assist Status', joinData.assist_status],
    ['Referrer UID', referrerUid],
    ['Referrer', referrerView],
    ['Referee UID', joinData.referee_uid],
  ].filter(([, v]) => v != null);

  if (rows.length === 0) return '';
  return `<div class="join-info">${rows
    .map(
      ([l, v]) =>
        `<div class="info-row"><span class="info-label">${escHtml(l)}</span><span>${escHtml(String(v))}</span></div>`,
    )
    .join('')}</div>`;
}
