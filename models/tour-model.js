const mongoose = require('mongoose');
const slugify = require("slugify");
//const User = require("./user-model");
//const validator = require("validator");

//temporary - Schema
const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true,
    trim: true,
    maxLength: [40,"Tour name cannot be longer than 40 characters"],
    minLength: [10,"Tour name must be at least 10 characters long"],
    // validate: {
    //   validator: function(val) {
    //     return validator.isAlpha(val.replace(/ /g,""));
    //   },
    //   message: "Tour Name must only contain characters"
    // }  
  },
  slug: {
    type: String
  },  
  ratingsAverage: {
    type: Number,
    default: 4.5,
    min: [1.0,"Average Rating must be >= 1.0"],
    max: [5.0,"Average Rating must be <= 5.0"],
    set: val => Math.round(val * 100) / 100
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price'],
  },
  priceDiscount: {
    type: Number,
    validate: {
      validator: function(val) { return val <= this.price;},
      message: `Discounted Price: ({VALUE}) must be <= Price`
    }  
  },
  duration: {
    type: Number,
    required: [true, "A tour must have a duration"]
  },
  maxGroupSize: {
    type: Number,
    required: [true, "A tour must have a maximum group size"]
  },
  difficulty: {
    type: String,
    required: [true, "A tour must have a dififculty rating"],
    enum: {
      values: ["easy","medium","difficult"],
      message: "Allowed difficulty values: easy, medium, or difficult"
    }    
  },
  summary: {
    type: String,
    trim: true,
    required: [true,"A tour must have a description"] 
  },
  description: {
    type: String,
    trim: true
  },
  imageCover: {
    type: String,
    required: [true,"A tour must have a cover image"]     
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false
  },
  //we can pass a string representing a date or a UNIX timestamp - mongo will try to parse this value and convert to a date
  startDates: [Date],
  secretTour: {
    type: Boolean,
    default: false
  },
  startLocation: {
    type: {
      type: String,
      default: "Point",
      enum: ["Point"]      
    },
    coordinates: [Number], //array of 2 numbers - lat, lng
    address: String,
    description: String
  },
  locations: [
    {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"]  
      },
      coordinates: [Number],
      address: String,
      description: String,
      day: Number
    }
  ],
  guides: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User"
    }  
  ]
}, { 
  toJSON: { virtuals: true}, //when data get outputted as JSON
  toObject: { virtuals: true} //when data get outputted as JS Object
});

//create indexes
//tourSchema.index({price: 1});
tourSchema.index({price: 1, ratingsAverage: -1});
tourSchema.index({slug: 1});
tourSchema.index({startLocation: "2dsphere"});

//virtual property - getter - like a read-only property on a class
tourSchema.virtual("durationWeeks").get( function(){
  //this - current document
  return this.duration / 7;
})

//virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

//Document Middleware - pre runs before .create() & .save() commands, but NOT before .insertMany()
tourSchema.pre("save", function(next) {
  this.slug = slugify(this.name, {lower: true});
  next();
});

//Find user documents and add them to the document
// tourSchema.pre("save", async function(next) {
//   const guidesPromise = this.guides.map( id => User.findById(id));
//   this.guides = await Promise.all(guidesPromise)  
//   next();
// });

//Document Middleware - post runs before .create() & .save() commands, but NOT before .insertMany()
// tourSchema.post("save", function(doc,next) {
//   //doc - finished document
//   next();
// });

//Query Middleware - runs before select query is executed
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: {$ne: true}});
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {  
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt"
  });  
  next();
});


// tourSchema.pre(/^find/, function(next) {  
//   this.populate({
//     path: "reviews",
//     select: "title review rating"
//   });  
//   next();
// });

// eslint-disable-next-line prefer-arrow-callback
tourSchema.post(/^find/, function(docs, next) {  
  //console.log(`Execution time: ${Date.now() - this.start} ms`);
  next();
});

//Aggregation Middleware
// tourSchema.pre("aggregate", function(next) {
//   this.pipeline().unshift( { '$match': { secretTour: {$ne: true}} });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
