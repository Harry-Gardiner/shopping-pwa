const itemForm = document.getElementById('item-form');
const itemInput = document.getElementById('item-input');
const itemList = document.getElementById('item-list');
const gotList = document.getElementById('got-list'); // Reference to the second ul
const clearBtn = document.getElementById('clear');
const formBtn = itemForm.querySelector('button');
let isEditMode = false;

function displayItems() {
  const itemsFromStorage = getItemsFromStorage();
  itemsFromStorage.forEach((item) => addItemToDOM(item));
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

  addItemToDOM(newItem);
  addItemToStorage(newItem);
  checkUI();
  itemInput.value = '';
}

function addItemToDOM(item, list = itemList) {
  const li = document.createElement('li');
  li.appendChild(document.createTextNode(item));

  const button = createButton('remove-item btn-link text-red');
  li.appendChild(button);

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

function addItemToStorage(item) {
  const itemsFromStorage = getItemsFromStorage();
  itemsFromStorage.push(item);
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
}

function setItemToNotGot(item) {
  itemList.appendChild(item);
}

function checkIfItemExists(item) {
  const itemsFromStorage = getItemsFromStorage();
  return itemsFromStorage.includes(item);
}

function removeItem(item) {
    item.remove();
    removeItemFromStorage(item.textContent);
    checkUI();
}

function removeItemFromStorage(item) {
  let itemsFromStorage = getItemsFromStorage();
  itemsFromStorage = itemsFromStorage.filter((i) => i !== item);
  localStorage.setItem('items', JSON.stringify(itemsFromStorage));
}

function clearItems() {
  while (itemList.firstChild) {
    itemList.removeChild(itemList.firstChild);
  }
  localStorage.removeItem('items');
  checkUI();
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

function init() {
  itemForm.addEventListener('submit', onAddItemSubmit);
  itemList.addEventListener('click', onClickItem);
  gotList.addEventListener('click', onClickItem); // Add event listener for gotList
  clearBtn.addEventListener('click', clearItems);
  document.addEventListener('DOMContentLoaded', displayItems);
  checkUI();
}

init();