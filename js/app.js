const itemForm = document.getElementById('item-form');
const itemInput = document.getElementById('item-input');
const itemList = document.getElementById('item-list');
const gotList = document.getElementById('got-list');
const resetBtn = document.getElementById('reset');
const clearBtn = document.getElementById('clear');
const formBtn = itemForm.querySelector('button');
let isEditMode = false;

function displayItems() {
  const itemsFromStorage = getItemsFromStorage();
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
  list.appendChild(li);
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
  gotList.appendChild(item);
  updateItemInStorage(item.textContent, 'got-list');
}

function setItemToNotGot(item) {
  itemList.appendChild(item);
  updateItemInStorage(item.textContent, 'item-list');
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

function clearItems() {
   if (confirm('Are you sure you want to clear all items?')) {
    while (itemList.firstChild) {
      itemList.removeChild(itemList.firstChild);
    }
    while (gotList.firstChild) {
      gotList.removeChild(gotList.firstChild);
    }
    localStorage.removeItem('items');
    checkUI();
  }
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
  if(confirm('Are you sure you want to reset the list?')) {
    const items = gotList.querySelectorAll('li');
    items.forEach((item) => {
      itemList.appendChild(item);
      updateItemInStorage(item.textContent, 'item-list');
    });
  }
}

function init() {
  itemForm.addEventListener('submit', onAddItemSubmit);
  itemList.addEventListener('click', onClickItem);
  gotList.addEventListener('click', onClickItem);
  clearBtn.addEventListener('click', clearItems);
  resetBtn.addEventListener('click', resetList);
  document.addEventListener('DOMContentLoaded', displayItems);
  checkUI();
}

init();