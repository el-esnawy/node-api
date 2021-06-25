const sharp = require('sharp');
const multer = require('multer');
const Tour = require('../models/tourModel');

const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/AppError');

const multerStorage = multer.memoryStorage(); // image stored at the buffed at req.file.buufer

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an Image! please upload only images', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadTourImgs = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.array('images', 5) // array of "iamges" with the same name

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}--cover.jpeg`;

  if (!req.files.imageCover) return next();

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  if (!req.files.images) return next();
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (image, index) => {
      const filename = `tour-${req.params.id}-${Date.now()}--${index + 1}.jpeg`;

      await sharp(image.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// exports.getTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//   if (!tour) {
//     return next(new AppError('No Tour found for that ID', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: { tour }
//   });
// });

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // _id: '$ratingsAverage',
        numTours: { $sum: 1 },
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    },
    {
      $match: {
        _id: { $ne: 'EASY' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates' // expands the dates
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $sort: {
        numTourStarts: -1,
        _id: 1
      }
    },
    {
      $addFields: {
        month: '$_id'
      }
    },
    {
      $project: {
        //shows or doesnt show the field
        _id: 0 // hide _id field
      }
    },
    {
      $limit: 6 // show how many results
    }
  ]);

  res.status(200).json({
    status: 'success',
    length: plan.length,
    data: { plan }
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng)
    next(
      new AppError(
        'please provide a latitude and longitude in the format lat,lng',
        400
      )
    );

  // mongoDB expects the radius in radians
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius]
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng)
    next(
      new AppError(
        'please provide a latitude and longitude in the format lat,lng',
        400
      )
    );
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    unit,
    data: {
      data: distances
    }
  });
});

// OLD VERSIOn

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkID = (req, res, next, val) => {
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: `ID is Invalid`,
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name and/or price',
//     });
//   }
//   next();
// };
// exports.deletetTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);
//   if (!tour) {
//     return next(new AppError('No Tour found for that ID', 404));
//   }
//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });

// exports.getAllTours = async (req, res) => {
//   try {
//     //build the query
//     const queryObject = { ...req.query };
//     const excludedField = ['page', 'sort', 'limit', 'fields'];
//     excludedField.forEach((el) => delete queryObject[el]);

//     // 1) advanced filtering with operands

//     // let queryStr = JSON.stringify(queryObject);
//     // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // regex template to match exactly and with the g flag to match all occurances and then add the Dollar sign before the match

//     // console.log(JSON.parse(queryStr));

//     // filter object for a query: {difficulty: "easy", duration: {$gte :5}}
//     //execute the query
//     // let query = Tour.find(JSON.parse(queryStr)); // not async so we can chain more methods to it like  sort and page

//     // //2) advanced filtering with sorting
//     // if (req.query.sort) {
//     //   const sortBy = req.query.sort.split(',').join(' ');
//     //   query = query.sort(sortBy);
//     // } else {
//     //   query = query.sort('-createdAt');
//     // }

//     //3) advanced filtering with field limiting

//     // if (req.query.fields) {
//     //   const fields = req.query.fields.split(',').join(' ');
//     //   console.log(fields);
//     //   query = query.select(fields);
//     // } else {
//     //   query = query.select('-__v');
//     // }

//     //4 pagination

//     // const page = req.query.page * 1 || 1;
//     // const lim = req.query.limit * 1 || 100;
//     // const skip = (page - 1) * lim;

//     // if (req.query.page) {
//     //   const numberOfTours = await Tour.countDocuments();
//     //   if (skip >= numberOfTours) throw new Error('This page does not exist');
//     // }
//     // query = query.skip(skip).limit(lim);

//     //Execture Query
//     const features = new APIFeatures(Tour.find(), req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();
//     const tours = await features.query;

//     res.status(200).json({
//       status: 'success',
//       length: tours.length,
//       data: {
//         tours,
//       },
//     });
//   } catch (error) {
//     res.status(404).json({
//       status: 'fail',
//       message: error,
//     });
//   }
// };
// exports.createTour = catchAsync(async (req, res, next) => {
//   // const newTour = new Tour({});
//   // newTour.save();
//   // const newTour = Object.assign({ id: newID }, req.body);

//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   });
// });
