/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const updateSettings = async (data, type) => {
  const url =
    type === 'password'
      ? '/api/v1/users/updatePassword'
      : '/api/v1/users/updateMe';

  try {
    const res = await axios({
      method: 'PATCH',
      url,
      data
    });

    if (res.data.status === 'success') {
      console.log(res.data);
      showAlert('success', `${type.toLowerCase()} updated successfully`);
    }
  } catch (error) {
    showAlert('error', error.response.data.message);
    console.log(error.response);
  }
};
