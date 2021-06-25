/* eslint-disable */
import '@babel/polyfill';
import { login, logout } from './login.js';
import { displayMap } from './mapbox.js';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

console.log('hello from parcel');

const mapTarget = document.getElementById('map');
const loginForm = document.querySelector('.form__login');
const email = document.getElementById('email');
const password = document.getElementById('password');
const logoutButton = document.querySelector('.nav__el--logout');
const updateForm = document.querySelector('.form-user-data');
const updatePasswordForm = document.querySelector('.form-user-settings');
const bookBtn = document.getElementById('book-tour');

if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const emailValue = email.value;
    const passwordValue = password.value;
    login(emailValue, passwordValue);
  });
}
if (mapTarget) {
  const locations = JSON.parse(mapTarget.dataset.locations);
  displayMap(locations);
}

if (logoutButton) {
  logoutButton.addEventListener('click', function(e) {
    logout();
  });
}

if (updateForm) {
  updateForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const form = new FormData();
    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;
    form.append('name', name);
    form.append('email', email);
    form.append('photo', document.getElementById('photo').files[0]);
    console.log(form);

    updateSettings(form, 'data');
  });
}

if (updatePasswordForm) {
  updatePasswordForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    const respone = await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
    document.querySelector('.btn--save-password').textContent = 'Save Password';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', function(e) {
    e.target.textContent = 'processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}
