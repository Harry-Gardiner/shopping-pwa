const itemForm = document.getElementById('item-form');
const itemInput = document.getElementById('item-input');
const itemList = document.getElementById('item-list');
const gotList = document.getElementById('got-list');
const gotSection = document.getElementById('got-section');
const resetBtn = document.getElementById('reset');
const exportBtn = document.getElementById('export');
const importBtn = document.getElementById('import');

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showToastWithUndo(name, listId, qty) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast toast-undo';
  toast.innerHTML = `<span>Removed "${escapeHtml(name)}"</span><button class="toast-undo-btn" type="button">Undo</button>`;
  container.appendChild(toast);

  let undone = false;
  let timer;

  const dismiss = () => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-undo-btn').addEventListener('click', () => {
    if (undone) return;
    undone = true;
    clearTimeout(timer);
    addItemToDOM(name, listId, qty);
    addItemToStorage(name, listId, qty);
    updateGotSection();
    dismiss();
  });

  requestAnimationFrame(() => toast.classList.add('visible'));
  timer = setTimeout(dismiss, 4000);
}

// ── Storage ────────────────────────────────────────────────────────────────

function getItemsFromStorage() {
  const data = localStorage.getItem('items');
  return data ? JSON.parse(data) : [];
}

function addItemToStorage(item, listId, qty = 1) {
  const items = getItemsFromStorage();
  items.push({ name: item, list: listId, qty });
  localStorage.setItem('items', JSON.stringify(items));
}

function updateItemInStorage(itemName, listId) {
  const items = getItemsFromStorage().map((i) =>
    i.name === itemName ? { ...i, list: listId } : i
  );
  localStorage.setItem('items', JSON.stringify(items));
}

function removeItemFromStorage(itemName) {
  const filtered = getItemsFromStorage().filter((i) => i.name !== itemName);
  localStorage.setItem('items', JSON.stringify(filtered));
}

function checkIfItemExists(item) {
  return getItemsFromStorage().some(
    (i) => i.name.toLowerCase() === item.toLowerCase()
  );
}

// ── DOM helpers ────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function createButton(classes) {
  const btn = document.createElement('button');
  btn.className = classes;
  btn.setAttribute('aria-label', 'Remove item');
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-xmark';
  btn.appendChild(icon);
  return btn;
}

function createQtyControl(qty) {
  const div = document.createElement('div');
  div.className = 'qty-control';
  div.innerHTML = `
    <button type="button" class="qty-btn qty-dec" ${qty <= 1 ? 'disabled' : ''} aria-label="Decrease">−</button>
    <span class="qty-val">${qty}</span>
    <button type="button" class="qty-btn qty-inc" aria-label="Increase">+</button>
  `;
  return div;
}

function addItemToDOM(item, listId, qty = 1) {
  const li = document.createElement('li');
  li.dataset.name = item;
  li.dataset.qty = qty;
  const span = document.createElement('span');
  span.className = 'item-text';
  span.textContent = item;
  li.appendChild(span);
  li.appendChild(createQtyControl(qty));
  li.appendChild(createButton('remove-item'));
  const list = listId === 'item-list' ? itemList : gotList;
  insertSorted(li, list);
  addSwipeToDelete(li);
}

function insertSorted(li, list) {
  const name = li.dataset.name || li.textContent.trim();
  const items = Array.from(list.getElementsByTagName('li'));
  const idx = items.findIndex((el) => {
    const elName = el.dataset.name || el.textContent.trim();
    return elName.localeCompare(name) > 0;
  });
  if (idx === -1) list.appendChild(li);
  else list.insertBefore(li, items[idx]);
}

function updateGotSection() {
  gotSection.classList.toggle('visible', gotList.children.length > 0);
}

// ── Swipe to delete ────────────────────────────────────────────────────────

function addSwipeToDelete(li) {
  let startX = 0, startY = 0, currentX = 0, didSwipe = false;
  const THRESHOLD = 80;

  li.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = 0;
    didSwipe = false;
    li.style.transition = 'none';
  }, { passive: true });

  li.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!didSwipe && Math.abs(dx) < 8) return;
    if (!didSwipe && Math.abs(dy) > Math.abs(dx)) return;
    didSwipe = true;
    currentX = Math.min(0, dx);
    li.style.transform = `translateX(${currentX}px)`;
    const ratio = Math.min(Math.abs(currentX) / THRESHOLD, 1);
    li.style.backgroundColor = `rgba(231, 76, 60, ${ratio * 0.12})`;
  }, { passive: true });

  li.addEventListener('touchend', () => {
    if (!didSwipe) return;

    if (Math.abs(currentX) >= THRESHOLD) {
      li.dataset.swiped = 'true';
      const name = li.dataset.name;
      const listId = li.parentElement?.id || 'item-list';
      const qty = parseInt(li.dataset.qty) || 1;

      li.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      li.style.transform = 'translateX(-110%)';
      li.style.opacity = '0';

      setTimeout(() => {
        if (li.parentElement) li.remove();
        removeItemFromStorage(name);
        updateGotSection();
      }, 250);

      showToastWithUndo(name, listId, qty);
    } else {
      li.dataset.swiped = 'true';
      li.style.transition = 'transform 0.2s ease, background-color 0.2s ease';
      li.style.transform = '';
      li.style.backgroundColor = '';
      setTimeout(() => {
        delete li.dataset.swiped;
        li.style.transition = '';
      }, 300);
    }
    didSwipe = false;
  });
}

// ── Items ──────────────────────────────────────────────────────────────────

function displayItems() {
  const items = getItemsFromStorage();
  items.sort((a, b) => a.name.localeCompare(b.name));
  items.forEach((item) => addItemToDOM(item.name, item.list, item.qty || 1));
  updateGotSection();
}

function onAddItemSubmit(e) {
  e.preventDefault();
  const newItem = itemInput.value.trim();
  if (!newItem) return;

  const existing = getItemsFromStorage().find(
    (i) => i.name.toLowerCase() === newItem.toLowerCase()
  );

  if (existing) {
    if (existing.list === 'got-list') {
      const li = Array.from(gotList.querySelectorAll('li')).find(
        (el) => (el.dataset.name || '').toLowerCase() === newItem.toLowerCase()
      );
      if (li) setItemToNotGot(li);
    }
    itemInput.value = '';
    filterItems('');
    return;
  }

  addItemToDOM(newItem, 'item-list');
  addItemToStorage(newItem, 'item-list');
  itemInput.value = '';
  filterItems('');
}

function triggerRipple(li, e) {
  const rect = li.getBoundingClientRect();
  const src = e.changedTouches?.[0] ?? e.touches?.[0] ?? e;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = (src.clientX - rect.left) + 'px';
  ripple.style.top = (src.clientY - rect.top) + 'px';
  li.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function onClickItem(e) {
  const li = e.target.closest('li');
  if (!li || li.dataset.swiped) return;

  if (e.target.closest('.remove-item')) {
    removeItemWithUndo(li);
    return;
  }

  if (e.target.closest('.qty-inc')) {
    updateQty(li, 1);
    return;
  }

  if (e.target.closest('.qty-dec')) {
    updateQty(li, -1);
    return;
  }

  if (e.target.closest('.qty-control')) return;

  const targetList = li.parentElement.id;
  triggerRipple(li, e);
  setTimeout(() => {
    if (targetList === 'item-list') setItemToGot(li);
    else if (targetList === 'got-list') setItemToNotGot(li);
  }, 150);
}

function setItemToGot(item) {
  const name = item.dataset.name || item.textContent.trim();
  insertSorted(item, gotList);
  updateItemInStorage(name, 'got-list');
  updateGotSection();
}

function setItemToNotGot(item) {
  const name = item.dataset.name || item.textContent.trim();
  insertSorted(item, itemList);
  updateItemInStorage(name, 'item-list');
  updateGotSection();
}

function updateQty(li, delta) {
  const current = parseInt(li.dataset.qty) || 1;
  const newQty = Math.max(1, current + delta);
  if (newQty === current) return;
  li.dataset.qty = newQty;
  li.querySelector('.qty-val').textContent = newQty;
  const decBtn = li.querySelector('.qty-dec');
  if (decBtn) decBtn.disabled = newQty <= 1;

  const items = getItemsFromStorage().map((i) =>
    i.name === li.dataset.name ? { ...i, qty: newQty } : i
  );
  localStorage.setItem('items', JSON.stringify(items));
}

function removeItemWithUndo(li) {
  const name = li.dataset.name;
  const listId = li.parentElement?.id || 'item-list';
  const qty = parseInt(li.dataset.qty) || 1;

  li.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  li.style.transform = 'translateX(-100%)';
  li.style.opacity = '0';

  setTimeout(() => {
    if (li.parentElement) li.remove();
    removeItemFromStorage(name);
    updateGotSection();
  }, 200);

  showToastWithUndo(name, listId, qty);
}

function filterItems(query) {
  const q = query.toLowerCase().trim();
  Array.from(itemList.querySelectorAll('li')).forEach((li) => {
    const name = (li.dataset.name || '').toLowerCase();
    li.style.display = q.length > 0 && !name.includes(q) ? 'none' : '';
  });
}

function resetList() {
  if (!confirm('Move all items to "Already got"?')) return;
  Array.from(itemList.querySelectorAll('li')).forEach(setItemToGot);
}

// ── Share ──────────────────────────────────────────────────────────────────

async function shareList() {
  const items = getItemsFromStorage()
    .filter((i) => i.list === 'item-list')
    .sort((a, b) => a.name.localeCompare(b.name));

  if (items.length === 0) { showToast('List is empty', 'info'); return; }

  const text = items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join('\n');

  try {
    await navigator.clipboard.writeText(text);
    showToast('List copied to clipboard!');
  } catch {
    showToast('Could not copy', 'error');
  }
}

// ── Export / Import ────────────────────────────────────────────────────────

function exportShoppingList() {
  const blob = new Blob([localStorage.getItem('items')], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shopping-list.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toggleFileImport() {
  document.getElementById('file-import-overlay').classList.toggle('active');
}

function closeFileImport() {
  document.getElementById('file-import-overlay').classList.remove('active');
}

function importShoppingList(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported) || !imported.every((i) => i.name && i.list)) {
        throw new Error('Invalid structure');
      }
      localStorage.setItem('items', JSON.stringify(imported));
      itemList.innerHTML = '';
      gotList.innerHTML = '';
      displayItems();
      closeFileImport();
      showToast('Shopping list imported!');
    } catch {
      showToast('Invalid file format', 'error');
    }
  };
  reader.readAsText(file);
}

// ── Meal Plans ─────────────────────────────────────────────────────────────

function getMealPlans() {
  const data = localStorage.getItem('mealPlans');
  return data ? JSON.parse(data) : [];
}

function saveMealPlans(plans) {
  localStorage.setItem('mealPlans', JSON.stringify(plans));
}

let newMealItems = [];

function openMealPlans() {
  document.getElementById('meal-plan-panel').classList.add('active');
  renderMealPlans();
  hideNewMealForm();
}

function closeMealPlans() {
  document.getElementById('meal-plan-panel').classList.remove('active');
}

function renderMealPlans() {
  const plans = getMealPlans();
  const listEl = document.getElementById('meal-plan-list');
  listEl.innerHTML = '';

  if (plans.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No meal plans yet. Create one below.</p>';
    return;
  }

  plans.forEach((plan) => {
    const div = document.createElement('div');
    div.className = 'meal-plan-item';
    div.innerHTML = `
      <div class="meal-plan-info">
        <span class="meal-plan-name">${escapeHtml(plan.name)}</span>
        <span class="meal-plan-ingredients">${plan.items.map(escapeHtml).join(', ')}</span>
      </div>
      <div class="meal-plan-actions">
        <button class="btn btn-sm add-meal-to-list" data-id="${plan.id}" title="Add to shopping list">
          <i class="fa-solid fa-cart-plus"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-meal" data-id="${plan.id}" title="Delete meal plan">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    listEl.appendChild(div);
  });
}

function addMealToList(planId) {
  const plan = getMealPlans().find((p) => p.id === planId);
  if (!plan) return;

  plan.items.forEach((itemName) => {
    const existing = getItemsFromStorage().find(
      (i) => i.name.toLowerCase() === itemName.toLowerCase()
    );
    if (existing) {
      if (existing.list === 'got-list') {
        const li = Array.from(gotList.querySelectorAll('li')).find(
          (el) => (el.dataset.name || '').toLowerCase() === itemName.toLowerCase()
        );
        if (li) setItemToNotGot(li);
      }
    } else {
      addItemToDOM(itemName, 'item-list');
      addItemToStorage(itemName, 'item-list');
    }
  });

  updateGotSection();
  showToast(`"${plan.name}" added to list`);
  closeMealPlans();
}

function deleteMealPlan(planId) {
  saveMealPlans(getMealPlans().filter((p) => p.id !== planId));
  renderMealPlans();
}

function showNewMealForm() {
  newMealItems = [];
  document.getElementById('meal-name-input').value = '';
  document.getElementById('meal-item-input').value = '';
  renderNewMealItems();
  document.getElementById('new-meal-form').classList.add('visible');
  document.getElementById('new-meal-plan-btn').style.display = 'none';
  document.getElementById('meal-name-input').focus();
}

function hideNewMealForm() {
  document.getElementById('new-meal-form').classList.remove('visible');
  document.getElementById('new-meal-plan-btn').style.display = '';
}

function renderNewMealItems() {
  const el = document.getElementById('meal-items-list');
  el.innerHTML = '';
  newMealItems.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'new-meal-item';
    div.innerHTML = `
      <span>${escapeHtml(item)}</span>
      <button type="button" class="btn-icon remove-new-item" data-index="${i}" aria-label="Remove">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    el.appendChild(div);
  });
}

function addNewMealItem() {
  const input = document.getElementById('meal-item-input');
  const val = input.value.trim();
  if (!val) return;
  if (!newMealItems.some((i) => i.toLowerCase() === val.toLowerCase())) {
    newMealItems.push(val);
    renderNewMealItems();
  }
  input.value = '';
  input.focus();
}

function saveMealPlan() {
  const name = document.getElementById('meal-name-input').value.trim();
  if (!name) { showToast('Enter a meal name', 'error'); return; }
  if (newMealItems.length === 0) { showToast('Add at least one item', 'error'); return; }
  const plans = getMealPlans();
  plans.push({ id: Date.now().toString(), name, items: [...newMealItems] });
  saveMealPlans(plans);
  hideNewMealForm();
  renderMealPlans();
  showToast(`"${name}" saved`);
}

// legacy stub for voice.js compatibility
function checkUI() {}

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  itemForm.addEventListener('submit', onAddItemSubmit);
  itemList.addEventListener('click', onClickItem);
  gotList.addEventListener('click', onClickItem);
  resetBtn.addEventListener('click', resetList);
  exportBtn.addEventListener('click', exportShoppingList);
  importBtn.addEventListener('click', toggleFileImport);
  document.getElementById('close').addEventListener('click', closeFileImport);
  document.getElementById('fileInput').addEventListener('change', importShoppingList);
  document.getElementById('share-btn').addEventListener('click', shareList);
  itemInput.addEventListener('input', () => filterItems(itemInput.value));

  document.getElementById('meal-plans-btn').addEventListener('click', openMealPlans);
  document.getElementById('close-meal-plans').addEventListener('click', closeMealPlans);
  document.getElementById('new-meal-plan-btn').addEventListener('click', showNewMealForm);
  document.getElementById('cancel-meal-btn').addEventListener('click', hideNewMealForm);
  document.getElementById('save-meal-btn').addEventListener('click', saveMealPlan);
  document.getElementById('add-meal-item-btn').addEventListener('click', addNewMealItem);

  document.getElementById('meal-item-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addNewMealItem(); }
  });

  document.getElementById('meal-plan-list').addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-meal-to-list');
    if (addBtn) { addMealToList(addBtn.dataset.id); return; }
    const delBtn = e.target.closest('.delete-meal');
    if (delBtn) { deleteMealPlan(delBtn.dataset.id); }
  });

  document.getElementById('meal-items-list').addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-new-item');
    if (removeBtn) {
      newMealItems.splice(parseInt(removeBtn.dataset.index), 1);
      renderNewMealItems();
    }
  });

  document.getElementById('meal-plan-panel').addEventListener('click', (e) => {
    if (e.target === document.getElementById('meal-plan-panel')) closeMealPlans();
  });

  displayItems();
}

init();
