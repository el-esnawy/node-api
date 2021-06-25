const Tour = require('../models/tourModel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');

const Booking = require('../models/bookingModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  //1- get tour data from collection
  const tours = await Tour.find();

  //2- build template
  //3- render that template using the tour data from step 1

  res.status(200).render('overview', {
    showingAlltours: true,
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  //1 get the data for the reqested tour
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user createdAt',
    populate: { path: 'users', fields: 'name photo' }
  });

  //2 build template
  //3 render templat eusing data from 1
  if (!tour) {
    return next(new AppError('There is no tour with that name', 400));
  }

  res.status(200).render('tour', {
    showingAlltours: false,
    url: req.url,
    title: tour.name,
    tour
  });
});

exports.getLoginForm = catchAsync(async (req, res) => {
  res.status(200).render('login', {
    showingAlltours: false,
    title: 'log into your account'
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    showingAlltours: false,
    title: 'Your Account'
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );
  res.status(200).render('account', {
    showingAlltours: false,
    title: 'Your Account',
    user: updatedUser
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  //1 - find all bookings
  const bookings = await Booking.find({
    user: req.user.id
  });

  //2 - find tours with the returned IDs
  const tourIDs = bookings.map(el => el.tour);
  const tours = await Tour.find({
    _id: {
      $in: tourIDs
    }
  });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});
