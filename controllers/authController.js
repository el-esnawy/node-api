const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Email = require('../utils/email');

const signToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    htttpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
    photo: req.body.photo
  });
  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1- check if email & password exist

  if (!email || !password) {
    return next(new AppError('please provide email and password', 400));
  }
  //2- check if user exist & ps is correct

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //3 - if eveything is ok send token to client

  createSendToken(user, 200, res);
});

// verification to ensure loged in

exports.protect = catchAsync(async (req, res, next) => {
  //1- get the token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in, please log in to get access', 401)
    );
  }
  //2- verify the token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3- check if the use still exist

  const freshUser = await User.findById(decoded.id);

  if (!freshUser) {
    return next(
      new AppError('The user belonging to the token no longer exists', 401)
    );
  }

  //4- check if user changed password after JWT was issued'

  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'Password recently changed, please log in using new password',
        401
      )
    );
  }
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

// ensures that the user has the proper permissions
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1- get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user to reset password', 404));
  }
  //2- generate random token

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // await user.save();

  //3-send it to user's email

  // const message = `Forgot your password? \nSubmit a PATCH request with your new password and password Confirm to : ${resetURL}\nYour reset password link Valid untill ${user.passwordResetExpiresIn} \nIf you didn't forget your password, please ignore this email`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: `Your reset password link`,
    //   message
    // });
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'Success',
      message: 'Token sent to email'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('there was an error sending the email. Try again later', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1- get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresIn: { $gt: Date.now() }
  });

  //2- if token has not expired and there is a user set a new password

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpiresIn = undefined;

  await user.save();
  //3- updated changedPasswordAt property for the user
  //4- log the user in, send JWT\
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1- get user from collection

  const user = await User.findById(req.user.id).select('+password'); //+password since select is set to false

  // 2- check if posted password is corect

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('your current password is wrong!', 401));
  }
  // 3- if correct then update the password

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4- log the user in, send JWT

  createSendToken(user, 200, res);
});

// only for rendered pages and there will be error
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      const freshUser = await User.findById(decoded.id);

      if (!freshUser) {
        return next();
      }

      //4- check if user changed password after JWT was issued'

      // if (freshUser.changedPasswordAfter(decoded.iat)) {
      //   return next();
      // }

      res.locals.user = freshUser;
      return next();
    }
    return next();
  } catch (error) {
    return next();
  }
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};
