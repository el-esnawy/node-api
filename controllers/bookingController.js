const st = require('stripe');
const Booking = require('../models/bookingModel');
const factory = require('../controllers/handlerFactory');

const stripe = st(
  'sk_test_51IxcZ3BNUyYQrrRiEIF8AqXyDvX0zaSDYg0IRcQoG3RzzPwpOUENcbigaGbIfp6TWkR2lAeuFzlOsAFdNWip45Hz006y1VTR56'
);
const Tour = require('../models/tourModel');

const catchAsync = require('../utils/catchAsync');
// const factory = require('./handlerFactory');
// const AppError = require('../utils/AppError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //1- get the currently booked Tour
  const tour = await Tour.findById(req.params.tourID);

  //2- create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourID
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,
    mode: 'payment',

    line_items: [
      {
        name: `${tour.name} Tour`,
        description: `${tour.summary}`,
        images: [
          `https://images.pexels.com/photos/6770410/pexels-photo-6770410.jpeg?cs=srgb&dl=pexels-anastasiya-vragova-6770410.jpg&fm=jpg`
        ],

        currency: 'usd',
        amount: tour.price * 100,
        quantity: 1
      }
    ]
  });

  //3- create session as response and send to client

  res.status(200).json({
    status: 'success',
    session
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) {
    return next();
  }

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
  next();
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
