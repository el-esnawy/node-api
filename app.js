const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));

//  1 -GLOBAL  middleware

// set security HTTP header
app.use(helmet());

// developement loggin
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit request from same api
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again later'
});
app.use('/api', limiter);

// body parser, reading data from body into req.body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(
  express.json({
    limit: '10kb'
  })
); // middleware needed to change the received data to json

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS (cross-site scripting)
app.use(xss());
// prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// app.use(hpp());
// serving static files
// app.use(express.static(`${__dirname}/public`));

// test middleware

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  next();
});

// 2- route handlers

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRoutes);

// ERROR HANDLING

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `can't find ${req.originalUrl} on this server `,
  // });

  // const err = new Error(`can't find ${req.originalUrl} on this server `);
  // err.status = 'fail';
  // err.statusCode = 404;
  // next(err); // whatever passed into next() is automatically an error and it will skip all other middleware function and go direcctly to error handling function

  // using our error handling class

  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
