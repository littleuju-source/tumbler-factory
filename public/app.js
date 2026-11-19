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
const newInspectionLink = document.getElementById('new-inspection-link');
const inspectionNewView = document.getElementById('inspection-new-view');
const productSelect = document.getElementById('inspection-product');
const dateInput = document.getElementById('inspection-date');
const revisionSelect = document.getElementById('inspection-revision');
const weightRange = document.getElementById('inspection-weight-range');
const imageInput = document.getElementById('inspection-images');
const imagePreviews = document.getElementById('inspection-image-previews');
let imageSelectionVersion = 0;
let selectedImageDataUrls = [];
const inspectionForm = document.getElementById('inspection-fields');
const inspectionSubmit = document.getElementById('inspection-submit');
const inspectionSubmitError = document.getElementById('inspection-submit-error');
const inspectionSubmitSuccess = document.getElementById('inspection-submit-success');
const homeView = document.getElementById('home-view');
const homeDate = document.getElementById('home-date');
const homeSummaryError = document.getElementById('home-summary-error');
const homeTotal = document.getElementById('home-total');
const homeNg = document.getElementById('home-ng');
const homeHold = document.getElementById('home-hold');
const homeReviewPending = document.getElementById('home-review-pending');
const homeListError = document.getElementById('home-list-error');
const homeInspectionList = document.getElementById('home-inspection-list');
const storageStatus = document.getElementById('storage-status');
let storageStatusRequestId = 0;
const homeSummaryCards = [...document.querySelectorAll('.home-summary-card')];
let activeHomeFilter = '';
let homeListRequestId = 0;
const inspectionDetailView = document.getElementById('inspection-detail-view');
const inspectionDetailContent = document.getElementById('inspection-detail-content');
const inspectionDetailError = document.getElementById('inspection-detail-error');
const detailInspectionId = document.getElementById('detail-inspection-id');
const detailProductName = document.getElementById('detail-product-name');
const detailDecision = document.getElementById('detail-decision');
const detailContentVersion = document.getElementById('detail-content-version');
const detailPanel = document.getElementById('detail-panel');
const detailPlaceholder = document.getElementById('detail-placeholder');
const detailPhotoMeasurement = document.getElementById('detail-photo-measurement');
const detailMainImage = document.getElementById('detail-main-image');
const detailThumbnails = document.getElementById('detail-thumbnails');
const detailValueProduct = document.getElementById('detail-value-product');
const detailValueDate = document.getElementById('detail-value-date');
const detailValueRevision = document.getElementById('detail-value-revision');
const detailValueWeight = document.getElementById('detail-value-weight');
const detailValueMemo = document.getElementById('detail-value-memo');
const detailEditForm = document.getElementById('detail-edit-form');
const detailEditProduct = document.getElementById('detail-edit-product');
const detailEditDate = document.getElementById('detail-edit-date');
const detailEditWeight = document.getElementById('detail-edit-weight');
const detailEditSave = document.getElementById('detail-edit-save');
const detailEditError = document.getElementById('detail-edit-error');
const detailTabs = [...document.querySelectorAll('.inspection-tabs [role="tab"]')];
let activeDetailImages = [];
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

  const isHome = route === '/';
  const isNewInspection = route === '/inspections/new';
  newInspectionLink.hidden = !isHome;
  inspectionNewView.hidden = !isNewInspection;
  document.getElementById('home-view').hidden = !isHome;
  document.getElementById('settings-view').hidden = route !== '/settings';
  document.getElementById('inspection-detail-view').hidden = !/^\/inspections\/[^/]+$/.test(route);

  if (isHome) void loadHomeSummary();
  if (route === '/settings') void loadStorageStatus();
  if (isNewInspection) void loadInspectionFields();
  if (/^\/inspections\/[^/]+$/.test(route)) void loadInspectionDetail(route);
}

async function loadStorageStatus() {
  const requestId = ++storageStatusRequestId;
  storageStatus.textContent = '저장소 상태를 불러오는 중입니다.';

  try {
    const response = await fetch('/api/operations');
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || '저장소 상태를 불러오지 못했습니다.');
    }
    if (requestId !== storageStatusRequestId || window.location.pathname !== '/settings') return;
    storageStatus.textContent = `저장소: ${result.label}`;
  } catch (error) {
    if (requestId !== storageStatusRequestId || window.location.pathname !== '/settings') return;
    storageStatus.textContent = error.message || '저장소 상태를 불러오지 못했습니다.';
  }
}

async function loadHomeSummary(date = '') {
  homeSummaryError.hidden = true;
  const query = date ? `?date=${encodeURIComponent(date)}` : '';

  try {
    const response = await fetch(`/api/home${query}`);
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || '하루 현황을 불러오지 못했습니다.');
    }

    if (!date && result.date) {
      homeDate.value = result.date;
      return loadHomeSummary(result.date);
    }

    homeTotal.textContent = String(result.total);
    homeNg.textContent = String(result.ng);
    homeHold.textContent = String(result.hold);
    homeReviewPending.textContent = String(result.review_pending);
    await loadHomeInspections(result.date || date);
  } catch (error) {
    homeSummaryError.textContent = error.message || '하루 현황을 불러오지 못했습니다.';
    homeSummaryError.hidden = false;
  }
}

async function loadHomeInspections(date) {
  const requestId = ++homeListRequestId;
  homeListError.hidden = true;
  homeInspectionList.replaceChildren();

  try {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (activeHomeFilter === 'NG' || activeHomeFilter === 'HOLD') {
      params.set('decision', activeHomeFilter);
    } else if (activeHomeFilter === 'review-pending') {
      params.set('review', 'pending');
    }
    const query = params.toString();
    const response = await fetch(`/api/inspections${query ? `?${query}` : ''}`);
    const inspections = await response.json();
    if (!response.ok || inspections.error) {
      throw new Error(inspections.error || '검사 목록을 불러오지 못했습니다.');
    }

    if (requestId !== homeListRequestId || window.location.pathname !== '/') return;
    renderHomeInspections(inspections);
  } catch (error) {
    if (requestId !== homeListRequestId) return;
    homeListError.textContent = error.message || '검사 목록을 불러오지 못했습니다.';
    homeListError.hidden = false;
  }
}

function renderHomeInspections(inspections) {
  homeInspectionList.replaceChildren();
  if (inspections.length === 0) {
    const message = document.createElement('p');
    message.className = 'home-list-message';
    message.textContent = activeHomeFilter
      ? '이 날짜에 이 종류의 검사가 없습니다.'
      : '이 날짜에 등록한 검사가 없습니다.';
    homeInspectionList.append(message);
    return;
  }

  const productNames = {
    'P-SILVER': '텀블러 실버',
    'P-WHITE': '텀블러 화이트',
    'P-BLACK': '텀블러 블랙',
  };
  const decisionLabels = { OK: '정상', NG: '불량', HOLD: '보류' };

  inspections.forEach((inspection) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'home-inspection-card';
    card.dataset.route = `/inspections/${encodeURIComponent(inspection.inspection_id)}`;

    if (inspection.images?.[0]) {
      const image = document.createElement('img');
      image.src = inspection.images[0];
      image.alt = '검사 사진';
      card.append(image);
    } else {
      const noPhoto = document.createElement('span');
      noPhoto.className = 'no-photo';
      noPhoto.textContent = '사진 없음';
      card.append(noPhoto);
    }

    const details = document.createElement('span');
    details.className = 'home-inspection-details';

    const id = document.createElement('strong');
    id.textContent = inspection.inspection_id;
    details.append(id);

    const product = document.createElement('span');
    product.textContent = productNames[inspection.product_id] || inspection.product_id;
    details.append(product);

    const weight = document.createElement('span');
    weight.textContent = inspection.weight_g === null ? '미측정' : `${inspection.weight_g}g`;
    details.append(weight);

    const decision = document.createElement('span');
    decision.textContent = decisionLabels[inspection.decision] || '미판정';
    details.append(decision);

    card.append(details);
    homeInspectionList.append(card);
  });
}

function updateHomeFilterSelection() {
  homeSummaryCards.forEach((card) => {
    card.setAttribute('aria-pressed', String(card.dataset.homeFilter === activeHomeFilter));
  });
}

async function loadInspectionDetail(route) {
  inspectionDetailError.hidden = true;
  inspectionDetailContent.hidden = true;

  const inspectionId = decodeURIComponent(route.slice('/inspections/'.length));
  try {
    const response = await fetch(`/api/inspections/${encodeURIComponent(inspectionId)}`);
    const inspection = await response.json();
    if (!response.ok || inspection.error) {
      throw new Error(inspection.error || '검사를 불러오지 못했습니다.');
    }
    if (window.location.pathname !== route) return;

    const productsResponse = await fetch('/api/products');
    const products = await productsResponse.json();
    if (!productsResponse.ok) {
      throw new Error(products.error || '제품 목록을 불러오지 못했습니다.');
    }

    const product = products.find((item) => item.product_id === inspection.product_id);
    const productName = product?.name || inspection.product_id;
    detailInspectionId.textContent = inspection.inspection_id;
    detailProductName.textContent = productName;
    detailDecision.textContent = inspection.decision || '미판정';
    detailContentVersion.textContent = `검사 기록 버전: ${inspection.content_version}`;
    detailValueProduct.textContent = productName;
    detailValueDate.textContent = inspection.inspected_at;
    detailValueRevision.textContent = inspection.revision;
    detailValueWeight.textContent = inspection.weight_g === null ? '미측정' : `${inspection.weight_g}g`;
    detailValueMemo.textContent = inspection.memo || '없음';
    populateDetailProductOptions(inspection.product_id);
    detailEditDate.value = inspection.inspected_at.replace(' ', 'T');
    detailEditWeight.value = inspection.weight_g ?? '';
    detailEditError.hidden = true;
    renderDetailImages(Array.isArray(inspection.images) ? inspection.images : []);
    inspectionDetailContent.hidden = false;
    selectDetailTab(0);
  } catch (error) {
    if (window.location.pathname !== route) return;
    inspectionDetailError.textContent = error.message || '검사를 불러오지 못했습니다.';
    inspectionDetailError.hidden = false;
  }
}

function populateDetailProductOptions(selectedProductId) {
  const products = [
    ['P-SILVER', '은색 텀블러'],
    ['P-WHITE', '흰색 텀블러'],
    ['P-BLACK', '검정 텀블러'],
  ];

  detailEditProduct.replaceChildren(...products.map(([id, label]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    option.selected = id === selectedProductId;
    return option;
  }));
}

detailEditForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  detailEditError.hidden = true;
  if (!detailEditForm.reportValidity()) return;

  const weightValue = detailEditWeight.value;
  const dateValue = detailEditDate.value;
  const inspectionId = decodeURIComponent(window.location.pathname.slice('/inspections/'.length));
  detailEditSave.disabled = true;

  try {
    const response = await fetch(`/api/inspections/${encodeURIComponent(inspectionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: detailEditProduct.value,
        inspected_at: `${dateValue.replace('T', ' ')}${dateValue.length === 16 ? ':00' : ''}`,
        weight_g: weightValue === '' ? null : Number(weightValue),
      }),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || '검사 기록을 저장하지 못했습니다.');
    }
    await loadInspectionDetail(window.location.pathname);
  } catch (error) {
    detailEditError.textContent = error.message || '검사 기록을 저장하지 못했습니다.';
    detailEditError.hidden = false;
  } finally {
    detailEditSave.disabled = false;
  }
});

function renderDetailImages(images) {
  activeDetailImages = images;
  detailMainImage.replaceChildren();
  detailThumbnails.replaceChildren();

  if (images.length === 0) {
    detailMainImage.textContent = '등록된 사진이 없습니다.';
    return;
  }

  images.forEach((imageUrl, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `사진 ${index + 1} 크게 보기`);
    button.setAttribute('aria-current', String(index === 0));
    button.addEventListener('click', () => showDetailImage(index));

    const thumbnail = document.createElement('img');
    thumbnail.src = imageUrl;
    thumbnail.alt = `검사 사진 ${index + 1}`;
    button.append(thumbnail);
    detailThumbnails.append(button);
  });

  showDetailImage(0);
}

function showDetailImage(index) {
  const imageUrl = activeDetailImages[index];
  if (!imageUrl) return;

  const image = document.createElement('img');
  image.src = imageUrl;
  image.alt = `검사 사진 ${index + 1}`;
  detailMainImage.replaceChildren(image);
  [...detailThumbnails.querySelectorAll('button')].forEach((button, buttonIndex) => {
    button.setAttribute('aria-current', String(buttonIndex === index));
  });
}

function selectDetailTab(index) {
  detailTabs.forEach((tab, tabIndex) => {
    tab.setAttribute('aria-selected', String(tabIndex === index));
  });
  detailPanel.setAttribute('aria-labelledby', detailTabs[index].id);
  detailPhotoMeasurement.hidden = index !== 0;
  detailPlaceholder.hidden = index === 0;
  detailPlaceholder.textContent = index === 0 ? '' : '이 탭은 나중 회차에서 만듭니다.';
}

detailTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectDetailTab(index));
});

async function loadInspectionFields() {
  weightRange.textContent = '제품과 검사기준을 불러오는 중입니다.';

  try {
    const [productsResponse, standardResponse] = await Promise.all([
      fetch('/api/products'),
      fetch(`/api/standards/${encodeURIComponent(revisionSelect.value)}`),
    ]);
    const products = await productsResponse.json();
    const standard = await standardResponse.json();

    if (!productsResponse.ok) {
      throw new Error(products.error || '제품 목록을 불러오지 못했습니다.');
    }
    if (!standardResponse.ok) {
      throw new Error(standard.error || '검사기준을 불러오지 못했습니다.');
    }

    const previousProduct = productSelect.value;
    productSelect.replaceChildren(...products.map((product) => {
      const option = document.createElement('option');
      option.value = product.product_id;
      option.textContent = product.label;
      return option;
    }));
    if (products.some((product) => product.product_id === previousProduct)) {
      productSelect.value = previousProduct;
    }

    if (!dateInput.value) dateInput.value = currentKoreanDateTime();
    updateWeightRange(standard);
  } catch (error) {
    weightRange.textContent = error.message || '제품과 검사기준을 불러오지 못했습니다.';
  }
}

function currentKoreanDateTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date()).reduce((values, part) => {
    values[part.type] = part.value;
    return values;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function updateWeightRange(standard) {
  const range = standard.weight_g?.[productSelect.value];
  if (!range) {
    weightRange.textContent = '기준 중량을 확인할 수 없습니다.';
    return;
  }
  weightRange.textContent = `기준 중량: ${range.min}~${range.max}g`;
}

function renderDetailImages(images) {
  activeDetailImages = images;
  detailMainImage.replaceChildren();
  detailThumbnails.replaceChildren();

  if (images.length === 0) {
    detailMainImage.textContent = '등록된 사진이 없습니다.';
    return;
  }

  images.forEach((imageUrl, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `사진 ${index + 1} 크게 보기`);
    button.setAttribute('aria-current', String(index === 0));
    button.addEventListener('click', () => showDetailImage(index));

    const thumbnail = document.createElement('img');
    thumbnail.src = imageUrl;
    thumbnail.alt = `검사 사진 ${index + 1}`;
    button.append(thumbnail);
    detailThumbnails.append(button);
  });

  showDetailImage(0);
}

function showDetailImage(index) {
  const imageUrl = activeDetailImages[index];
  if (!imageUrl) return;

  const image = document.createElement('img');
  image.src = imageUrl;
  image.alt = `검사 사진 ${index + 1}`;
  detailMainImage.replaceChildren(image);
  [...detailThumbnails.querySelectorAll('button')].forEach((button, buttonIndex) => {
    button.setAttribute('aria-current', String(buttonIndex === index));
  });
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

if (imageInput && imagePreviews) imageInput.addEventListener('change', async () => {
  const selectionVersion = ++imageSelectionVersion;
  imagePreviews.replaceChildren();
  const files = [...imageInput.files];

  try {
    const dataUrls = await Promise.all(files.map(readImageAsDataUrl));
    if (selectionVersion !== imageSelectionVersion) return;

    selectedImageDataUrls = dataUrls;
    dataUrls.forEach((dataUrl, index) => {
      const image = document.createElement('img');
      image.src = dataUrl;
      image.alt = `선택한 사진 ${index + 1}`;
      imagePreviews.append(image);
    });
  } catch (error) {
    if (selectionVersion !== imageSelectionVersion) return;
    imagePreviews.textContent = error.message || '사진을 읽지 못했습니다.';
  }
});

if (inspectionForm && inspectionSubmit && inspectionSubmitError) {
  inspectionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    inspectionSubmitError.hidden = true;
    inspectionSubmitSuccess.hidden = true;

    if (!inspectionForm.reportValidity()) return;
    if (selectedImageDataUrls.length === 0) {
      inspectionSubmitError.textContent = '사진을 골라 주세요.';
      inspectionSubmitError.hidden = false;
      return;
    }

    inspectionSubmit.disabled = true;
    const weightValue = document.getElementById('inspection-weight').value;
    const dateValue = dateInput.value;
    const payload = {
      product_id: productSelect.value,
      inspected_at: `${dateValue.replace('T', ' ')}${dateValue.length === 16 ? ':00' : ''}`,
      revision: revisionSelect.value,
      weight_g: weightValue === '' ? null : Number(weightValue),
      memo: document.getElementById('inspection-memo').value,
      images: selectedImageDataUrls,
    };

    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || '검사를 등록하지 못했습니다.');
      }

      inspectionSubmitSuccess.textContent = `검사가 저장되었습니다. 검사번호: ${result.inspection_id}`;
      inspectionSubmitSuccess.hidden = false;
    } catch (error) {
      inspectionSubmitError.textContent = error.message || '검사를 등록하지 못했습니다.';
      inspectionSubmitError.hidden = false;
    } finally {
      inspectionSubmit.disabled = false;
    }
  });
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

if (productSelect) productSelect.addEventListener('change', () => void loadInspectionFields());
if (revisionSelect) revisionSelect.addEventListener('change', () => void loadInspectionFields());
if (homeDate) homeDate.addEventListener('change', () => void loadHomeSummary(homeDate.value));
homeSummaryCards.forEach((card) => {
  card.addEventListener('click', () => {
    const filter = card.dataset.homeFilter || '';
    activeHomeFilter = filter === 'all' || filter === activeHomeFilter ? '' : filter;
    updateHomeFilterSelection();
    void loadHomeInspections(homeDate.value);
  });
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest('a[data-link], button[data-route]');
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

  const destinationPath = link instanceof HTMLAnchorElement ? link.href : link.dataset.route;
  const destination = new URL(destinationPath, window.location.href);
  if (destination.origin !== window.location.origin) return;

  event.preventDefault();
  navigateTo(`${destination.pathname}${destination.search}${destination.hash}`);
});

window.addEventListener('popstate', showScreenForCurrentAddress);

void checkLogin();