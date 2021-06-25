/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const response = await axios({
      method: 'POST',
      url: `http://localhost:3000/api/v1/users/login`,
      data: {
        email,
        password
      }
    });

    console.log(response);

    if (response.data.status === 'success') {
      showAlert('success', 'Logged in Successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1000);
    }
  } catch (error) {
    showAlert('error', error.response.data.message);

    // alert(error.response.data.message);
  }
};

export const logout = async () => {
  try {
    const response = await axios({
      method: 'GET',
      url: `http://localhost:3000/api/v1/users/logout`
    });

    if (response.data.status === 'success') {
      showAlert('success', 'Logged out Successfully');

      window.setTimeout(() => {
        location.reload();
      }, 1000);
    }
  } catch (error) {
    showAlert('error', 'Error Logging out! Try again.');
  }
};
