const AppError = require('../utils/AppError');

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack
    });
  }
  return res.status(err.statusCode).render('error', {
    title: 'something went wrong',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  //API

  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      // operational trusted error
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // log error

    // console.error('ERROR 💩💩', err);

    // send generic message
    return res.status(500).json({
      // programming or other unknown error; do not leak details
      status: 'error',
      msg: 'An Error has occured'
    });
  }
  //for thr rendered website
  return res.status(err.statusCode).render('error', {
    title: 'something went wrong',
    msg: 'Some error happened'
  });
};

const handleCastErrorDB = error => {
  const message = `Invalid ${error.path}: ${error.value} `;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDB = error => {
  const message = `Duplicate field: '${
    Object.keys(error.keyValue)[0]
  }' with value: '${
    Object.values(error.keyValue)[0]
  }'. please use another value!`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = error => {
  const errors = Object.values(error.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJWTerror = () =>
  new AppError('Invalid token. please log in again', 401);

const handleJWTExpired = () =>
  new AppError('Your token has expired, please log in again', 401);

module.exports = (err, req, res, next) => {
  // console.log(err.stack);
  err.statusCode = err.statusCode || 500; // 500 internal server error
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err }; // creating a hard copy of the err object also 'Object.assign({}, err)' works

    error.message = err.message;
    // console.log(err);
    // console.log(error);

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTerror();
    if (err.name === 'TokenExpiredError') error = handleJWTExpired();

    sendErrorProd(error, req, res);
  }
};
