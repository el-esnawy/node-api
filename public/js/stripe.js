/*eslint-disable*/
import { showAlert } from './alerts';
import axios from 'axios';
const stripe = Stripe(
  `pk_test_51IxcZ3BNUyYQrrRi7svzP2kML0oxbV8uSDhZdS1LO4PHg7hiIgj99LkwlQpYjORMH6f4aeHIBAIC2FIZkpAwQDNC005Guspi6e`
);

export const bookTour = async tourID => {
  // 1- get checkout session from API endpoint
  try {
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourID}`
    );

    console.log(session);
    // 2- create checkout from + charge credit card

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (error) {
    console.log(error);
    showAlert('error', error);
  }
};
