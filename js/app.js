const itemForm = document.getElementById('item-form');
const itemInput = document.getElementById('item-input');
const itemList = document.getElementById('item-list');
const gotList = document.getElementById('got-list');
const resetBtn = document.getElementById('reset');
const clearBtn = document.getElementById('clear');
const formBtn = itemForm.querySelector('button');
let isEditMode = false;
const exportBtn = document.getElementById('export');
const importBtn = document.getElementById('import');

function displayItems() {
  const itemsFromStorage = getItemsFromStorage();
  itemsFromStorage.sort((a, b) => a.name.localeCompare(b.name));
  itemsFromStorage.forEach((item) => addItemToDOM(item.name, item.list));
  checkUI();
}

function onAddItemSubmit(e) {
  e.preventDefault();

  const newItem = itemInput.value.trim();

  if (newItem === '') {
    alert('Please add an item');
    return;
  }

  if (isEditMode) {
    const itemToEdit = itemList.querySelector('.edit-mode');

    removeItemFromStorage(itemToEdit.textContent);
    itemToEdit.classList.remove('edit-mode');
    itemToEdit.remove();
    isEditMode = false;
  } else {
    if (checkIfItemExists(newItem)) {
      alert(`The item "${newItem}" already exists!`);
      return;
    }
  }

  addItemToDOM(newItem, 'item-list');
  addItemToStorage(newItem, 'item-list');
  checkUI();
  itemInput.value = '';
}

function addItemToDOM(item, listId) {
  const li = document.createElement('li');
  li.appendChild(document.createTextNode(item));

  const button = createButton('remove-item btn-link text-red');
  li.appendChild(button);

  const list = listId === 'item-list' ? itemList : gotList;

  const items = Array.from(list.getElementsByTagName('li'));
  const index = items.findIndex((li) => li.textContent.localeCompare(item) > 0);
  if (index === -1) {
    list.appendChild(li);
  } else {
    list.insertBefore(li, items[index]);
  }
}

function createButton(classes) {
  const button = document.createElement('button');
  button.className = classes;
  const icon = createIcon('fa-solid fa-xmark');
  button.appendChild(icon);
  return button;
}

function createIcon(classes) {
  const icon = document.createElement('i');
  icon.className = classes;
  return icon;
}

function addItemToStorage(item, listId) {
  const itemsFromStorage = getItemsFromStorage();
  itemsFromStorage.push({ name: item, list: listId });
  localStorage.setItem('items', JSON.stringify(itemsFromStorage));
}

function getItemsFromStorage() {
  let itemsFromStorage;
  if (localStorage.getItem('items') === null) {
    itemsFromStorage = [];
  } else {
    itemsFromStorage = JSON.parse(localStorage.getItem('items'));
  }
  return itemsFromStorage;
}

function onClickItem(e) {
  if (e.target.parentElement.classList.contains('remove-item')) {
    removeItem(e.target.parentElement.parentElement);
  } else if (e.target.closest('li')) {
    const item = e.target.closest('li');
    if (item.parentElement.id === 'item-list') {
      setItemToGot(item);
    } else if (item.parentElement.id === 'got-list') {
      setItemToNotGot(item);
    }
  }
}

function setItemToGot(item) {
  insertItemInOrder(item, gotList);
  updateItemInStorage(item.textContent, 'got-list');
}

function setItemToNotGot(item) {
  insertItemInOrder(item, itemList);
  updateItemInStorage(item.textContent, 'item-list');
}

function insertItemInOrder(item, list) {
  const items = Array.from(list.getElementsByTagName('li'));
  const index = items.findIndex((li) => li.textContent.localeCompare(item.textContent) > 0);
  if (index === -1) {
    list.appendChild(item);
  } else {
    list.insertBefore(item, items[index]);
  }
}

function updateItemInStorage(itemName, listId) {
  let itemsFromStorage = getItemsFromStorage();
  itemsFromStorage = itemsFromStorage.map((item) => {
    if (item.name === itemName) {
      return { name: itemName, list: listId };
    }
    return item;
  });
  localStorage.setItem('items', JSON.stringify(itemsFromStorage));
}

function checkIfItemExists(item) {
  const itemsFromStorage = getItemsFromStorage();
  return itemsFromStorage.some((i) => i.name === item);
}

function removeItem(item) {
  item.remove();
  removeItemFromStorage(item.textContent);
  checkUI();
}

function removeItemFromStorage(itemName) {
  let itemsFromStorage = getItemsFromStorage();
  itemsFromStorage = itemsFromStorage.filter((i) => i.name !== itemName);
  localStorage.setItem('items', JSON.stringify(itemsFromStorage));
}

function checkUI() {
  itemInput.value = '';
  const items = itemList.querySelectorAll('li');
  if (items.length === 0) {
    clearBtn.style.display = 'none';
  } else {
    clearBtn.style.display = 'block';
  }
  formBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Item';
  isEditMode = false;
}

function resetList() {
  if(confirm('Reseting the list will move all items to the top list. Are you sure?')) {
    const items = gotList.querySelectorAll('li');
    items.forEach((item) => {
      itemList.appendChild(item);
      updateItemInStorage(item.textContent, 'item-list');
    });
  }
}

function exportShoppingList() {
  // Get the shopping list from localStorage
  const shoppingList = localStorage.getItem('items');

  // Convert it to a Blob (a file-like object)
  const blob = new Blob([shoppingList], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to download the file
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shopping-list.json'; // Name of the file to be saved
  document.body.appendChild(a);
  a.click();

  // Clean up by removing the anchor and revoking the object URL
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function init() {
  itemForm.addEventListener('submit', onAddItemSubmit);
  itemList.addEventListener('click', onClickItem);
  gotList.addEventListener('click', onClickItem);
  resetBtn.addEventListener('click', resetList);
  exportBtn.addEventListener('click', exportShoppingList);
  document.addEventListener('DOMContentLoaded', displayItems);
  checkUI();
}

init();