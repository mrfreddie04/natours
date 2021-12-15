const mongoose = require("mongoose");
const Tour = require('./tour-model');

const reviewSchema = new mongoose.Schema({
  title: String,
  review: {
    type: String,
    required: [true, "Review cannot be empty"]
  },
  rating: {
    type: Number,
    required: [true, "Rating is required"],
    min: [1.0, "Rating must be between 1.0 and 5.0"],
    max: [5.0, "Rating must be between 1.0 and 5.0"],
  },  
  createdAt: {
    type: Date,
    default: Date.now()
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Review must have an author"]
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour",
    required: [true, "Review must belong to a tour"]
  }
},
{
  toObject: {virtuals: true},
  toJSON: {virtuals: true}
});

reviewSchema.index({tour: 1, user: 1}, {unique: true});

reviewSchema.pre('save', function(next) {
  //set for the initial creation only
  if (this.isNew && !this.createdAt) 
    this.createdAt = Date.now(); 

  next();
});

reviewSchema.post('save', async function(doc, next) {
  await this.constructor.calcAverageRatings(doc.tour);
  next();
});

reviewSchema.pre(/^find/, function(next) {  
  this.populate({
    path: "user",
    select: "name photo"
  });
  // .populate({
  //   path: "tour",
  //   select: "name price duration difficulty"
  // })
  next();
});

// Seems to be unncecessary - we can use DOCS in the post.find middleware
// reviewSchema.pre(/^findOneAnd/, async function(next) {  
//   const review = await this.findOne();
//   this.review = review;
//   next();
// });  

// eslint-disable-next-line prefer-arrow-callback
reviewSchema.post(/^findOneAnd/, async function(docs, next) {  
  if(docs) {
    await docs.constructor.calcAverageRatings(docs.tour);
  }
  next();
});  

reviewSchema.statics.calcAverageRatings = async function(tour) {
  //calculate rating aggregates
  const [stats] = await this.aggregate([
    {
      $match: { tour: tour}
    },
    {
      $group: {
        _id: null,
        cntRating: { $sum: 1},
        avgRating: { $avg: "$rating"}
      }
    }
  ]);

  //update tour
  if(stats) {
    await Tour.findByIdAndUpdate(
      tour, 
      { 
        ratingsAverage: stats.avgRating ,
        ratingsQuantity: stats.cntRating
      }, 
      {
        runValidators: true
      });
  } else {
    //no reviews exist
    await Tour.findByIdAndUpdate(
      tour, 
      { 
        ratingsAverage: 4.5,
        ratingsQuantity: 0
      }, 
      {
        runValidators: true
      });
  }
}

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;