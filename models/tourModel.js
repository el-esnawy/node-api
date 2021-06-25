const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have no more than 40 characters'],
      minlength: [10, 'A tour must have more than 10 characters']
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],// test
    },
    secretTour: { type: Boolean },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A Tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A Tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty can be either set to easy, medium, difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, 'rating must be above 0'],
      max: [5, 'rating must be below 5'],
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: { type: Number, required: [true, 'Tour must have a price'] },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          //this only points to current doc on NEW Document creation
          return val < this.price;
        },
        message: `Discount price ({VALUE}) should be below regular price `
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A Tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A Tour must have a cover image']
    },
    images: [String],
    createdAt: { type: Date, default: Date.now(), select: false },
    startDates: [Date],
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ]
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
// tourSchema.index({ price: 1, startDates: 1 }); // sorts the prices in ascending order if -1 then descending order
tourSchema.index({ price: 1, ratingsAverage: 1 }); // compound index;
tourSchema.index({ startLocation: '2dsphere' }); // telling mongoDb that the startlocaiton should be indexed to 2D sphere

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

// Query Middleware
tourSchema.pre(/^find/, function(next) {
  // triggered by all find methods
  this.find({
    secretTour: { $ne: true }
  });
  this.start = Date.now();
  next();
});
//AGGREGATION MIddleware

// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v'
  });

  next();
});

tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

tourSchema.pre('save', async function(next) {
  const guidesPromises = this.guides.map(async id => await User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  next();
});
// creating the model based on our schema and named it Tour
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

// DOCUMENT MIDDLEWARE // runs before .save() and .create()

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// tourSchema.pre(/^find/, function (next) {
//   // triggered by all find methods
//   console.log(Date.now() - this.start);

//   next();
// });
