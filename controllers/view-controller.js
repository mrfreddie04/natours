const catchAsync = require("../utils/catch-async");
const AppError = require("../utils/app-error");
const Tour = require("../models/tour-model");
const User = require("../models/user-model");
const Booking = require('../models/booking-model');

// const POLICY =
//   "default-src 'self' https://*.mapbox.com ;" +
//   "base-uri 'self';block-all-mixed-content;" +
//   "font-src 'self' https: data:;" +
//   "frame-ancestors 'self';" +
//   "img-src http://localhost:3000 'self' blob: data:;" +
//   "object-src 'none';" +
//   "script-src https: cdn.jsdelivr.net cdnjs.cloudflare.com api.mapbox.com 'self' blob: ;" +
//   "script-src-attr 'none';" +
//   "style-src 'self' https: 'unsafe-inline';" +
//   'upgrade-insecure-requests;';

// const POLICY2 =
//   "default-src 'self' https://*.mapbox.com ;"+
//   "base-uri 'self';block-all-mixed-content;"+
//   "font-src 'self' https: data:;"+
//   "frame-ancestors 'self';"+
//   "img-src 'self' data:;"+
//   "object-src 'none';"+
//   "script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;"+
//   "script-src-attr 'none';"+
//   "style-src 'self' https: 'unsafe-inline';"+
//   "upgrade-insecure-requests;"  

module.exports.setCSPHeaders = (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy', 
    "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests; connect-src *;"
  );
  next();
}

module.exports.getTour = catchAsync( async(req, res, next) => {
  //Get tour data
  const tour = await Tour.findOne({slug:req.params.slug}).populate({
    path: "reviews",
    select: "review rating user -tour"
  });
  //console.log(tour);
  //console.log(tour.reviews[0].user.name,tour.reviews[0].user.photo);
  if(!tour) {
    return next(new AppError("There is no tour with this name", 404));   
  }
  
  res.status(200).render("tour",{
    title: tour.name,
    tour: tour
  });  
});

module.exports.getOverview = catchAsync( async(req, res, next) => {
  //Get tour data
  const tours = await Tour.find();

  //Pass data to the template
  res.status(200).render("overview",{
    title: "All Tours",
    tours: tours
  }); 
});

module.exports.getLoginForm = (req, res) => {
  res.status(200).render("login",{
    title: "Log into your account"
  });
};  

module.exports.getAccount = (req, res )  => {
  res.status(200).render("account",{
    title: "Your account"
  });
};  

module.exports.getMyTours = catchAsync( async (req, res, next )  => {
  const user = req.user._id;

  //1) Find all bookings
  const bookings = await Booking.find({user:user});

  //2) Create array of IDs
  const tourIds = bookings.map( booking => booking.tour._id);

  //3) Find tours with the returned IDs
  const tours = await Tour.find({_id: { $in: tourIds } });

  res.status(200).render("overview", {
    title: "My Tours",
    tours: tours
  });  
});

module.exports.updateUserData = catchAsync( async (req, res, next )  => {
  console.log("/submit-user-data");
  //get data
  const { name, email } = req.body;

  //update user
  const updatedUser = await User.findByIdAndUpdate( 
    req.user._id,
    { name, email },
    { 
      new: true, //return update document
      runValidators: true //run validators
    }
  );

  res.status(200).render("account", {
    title: "Your account",
    user: updatedUser
  });
});  