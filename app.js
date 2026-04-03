const BASE = 'https://growth.didiglobal.com/litchi2/api';
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

$('countrySelect').addEventListener('change', () => {
  populateCitySelect($('countrySelect').value);
  applyCitySelection();
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

$('claimBtn').addEventListener('click', async () => {
  if (isClaiming) return;

  const cell = $('cell').value.trim();
  if (!cell) {
    $('cell').focus();
    return;
  }

  const callingCode = $('countryCallingCode').value.trim();
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
