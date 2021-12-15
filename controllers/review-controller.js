//const catchAsync = require("../utils/catch-async");
const Review = require("../models/review-model");
const factory = require("./route-handler-factory");

module.exports.setTourAndUserIds =  (req, res, next) => {
  if(!req.body.tour) req.body.tour = req.params.tourid;
  req.body.user = String(req.user._id);
  next();
}  

module.exports.setQueryParams =  (req, res, next) => {
  if(req.params.tourid) req.query.tour=req.params.tourid;
  next();
}  

module.exports.createReview = factory.createOne(Review);
module.exports.deleteReview = factory.deleteOne(Review);
module.exports.updateReview = factory.updateOne(Review);
module.exports.getReview = factory.getOne(Review,{ path: "tour", select: "name price duration difficulty" });
module.exports.getAllReviews = factory.getAll(Review);

// module.exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter = {};
//   if(req.params.tourid) filter= {tour:req.params.tourid};
  
//   const reviews = await Review.find(filter);

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: { reviews: reviews }
//   });
// });

// module.exports.createReview = catchAsync(async (req, res, next) => {
//   //let the user specify tourid in the body, if not retirevew from URL
//   if(!req.body.tour) req.body.tour = req.params.tourid;
//   //userid should be always referring to the loggied in user uissuing this request.
//   const reviewData = {...req.body, user: String(req.user._id)};
//   const review = await Review.create(reviewData);

//   res.status(201).json({
//     status: 'success',
//     data: { review: review }
//   });
// });