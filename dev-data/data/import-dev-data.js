const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

dotenv.config({ path: `./config.env` });
// mongoose

console.log(process.env.DATABASE_PASSWORD);

const DB = process.env.DATABASE;
mongoose
  .connect(DB, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true
  })
  .then(() => {
    console.log('DB Connection is successful');
  });

//READ FILE

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
// import data into DB

const importData = async () => {
  try {
    await User.create(users, { validateBeforeSave: false });
    await Tour.create(tours);
    await Review.create(reviews);
    // console.log('Data loaded Succesfully');
  } catch (error) {
    // console.log(error);
  }
  process.exit();
};

// delete all data from collection

const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    // console.log('data deleted');
  } catch (error) {
    // console.log(error);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
