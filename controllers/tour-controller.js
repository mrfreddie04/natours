const path = require("path");
const sharp = require("sharp");
const multer = require("multer");
const catchAsync = require("../utils/catch-async");
const AppError = require("../utils/app-error");
const Tour = require('../models/tour-model');
const factory = require("./route-handler-factory");

// const toursFile = `${__dirname}/../dev-data/data/tours-simple.json`;
// const tours = JSON.parse(fs.readFileSync(toursFile, { encoding: 'utf-8' }));

module.exports.aliasTopTours = async (req, res, next) => {
  req.query.limit = "5";
  req.query.page = "1";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  next();
}

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  const [type] = file.mimetype.split("/");
  if(type === "image") cb( null, true);
  else cb(new AppError("Not an image! Please upload only images", 400)); //may need to add a second param - false
};

//upload is a configured multer object //function multer(options?: multer.Options): multer.Multer;
const upload = multer({ 
  storage: multerStorage,
  fileFilter: multerFilter
}); 

// create middleware uploadUserPhoto by calling upload.single function with some configuration options
// usage: router.patch('/update-me', userController.uploadUserPhoto, userController.updateMe);
module.exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1},
  { name: "images", maxCount: 3},
]);


//create image transformation middleware
module.exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if( !req.files.imageCover || 
      req.files.imageCover.length === 0 || 
      !req.files.images ||
      req.files.images.length === 0
  ) return next();
  //console.log(req.files);
  //memoryStorage does not set file.filename
  //we need to set req.file.filename for the next middleware function to save the image path to DB!
  //extension is fixed to jpeg now
  // req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;
  const { id } = req.params;

  //1) Process cover image
  const [imageCover] = req.files.imageCover;  
  const imageCoverFileName = `tour-${id}-${Date.now()}-cover.jpeg`;
  await sharp(imageCover.buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({quality: 90})
    .toFile(path.join("public/img/tours", imageCoverFileName)); //path is relative to process.cwd()  
  req.body.imageCover = imageCoverFileName;

  console.log(imageCoverFileName);
    
  //2) Process secondary images  
  req.body.images = [];
  // eslint-disable-next-line no-restricted-syntax
  // for(const [idx, image] of req.files.images.entries()) {
  //   const imageName = `tour-${id}-${Date.now()}-${idx+1}.jpeg`;
  //   console.log(image,idx);
  //   // eslint-disable-next-line no-await-in-loop
  //   await sharp(image.buffer)
  //     .resize(500, 500)
  //     .toFormat("jpeg")
  //     .jpeg({quality: 90})
  //     .toFile(path.join("public/img/tours", imageName)); 
  //   req.body.images.push(imageName);  
  // };  

  await Promise.all( req.files.images.map( (image,idx) => {
    const imageName = `tour-${id}-${Date.now()}-${idx+1}.jpeg`;    
    const promise = sharp(image.buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({quality: 90})
      .toFile(path.join("public/img/tours", imageName)); 
    //console.log(image.originalname,imageName);
    req.body.images.push(imageName);  
    return promise;
  }));

  await Promise.all( req.files.images.map( async (image,idx) => {
    const imageName = `tour-${id}-${Date.now()}-${idx+1}.jpeg`;    
    await sharp(image.buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({quality: 90})
      .toFile(path.join("public/img/tours", imageName)); 
    //console.log(image.originalname,imageName);
    req.body.images.push(imageName);  
  }));  

  console.log("ALL DONE");
  next();
});


module.exports.createTour = factory.createOne(Tour);
module.exports.updateTour = factory.updateOne(Tour);
module.exports.deleteTour = factory.deleteOne(Tour);
module.exports.getTour = factory.getOne(Tour,{ path: "reviews" });
module.exports.getAllTours = factory.getAll(Tour);

//tours-within/:distance/center/:coords/unit/:unit
module.exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, coords, unit} = req.params;
  
  const [lat,lng] = coords.split(",").map( val => parseFloat(val));
  const dist = parseFloat(distance);
  const radius = unit === "mi" ? dist/3963.2 : dist/6378.1; //convert to radians

  //console.log(dist, lat, lng, unit);

  if(!lat || !lng) {
    return next(new AppError("You must provide latitude and longitude int the format lat,lng",400));
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: {$centerSphere: [[lng, lat], radius] } }
  })

  res.status(201).json({
    status: 'success',
    results: tours.length,
    params: {distance:dist, coords: { lat, lng}, unit},
    data: { 
      data: tours
    }
  });    
});  

module.exports.getDistances = catchAsync(async (req, res, next) => {
  const { coords, unit} = req.params;
  const [lat,lng] = coords.split(",").map( val => parseFloat(val));

  if(!lat || !lng) {
    return next(new AppError("You must provide latitude and longitude int the format lat,lng",400));
  }  

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      $geoNear: { 
        near: {
          type: "Point",
          coordinates: [lng, lat]
        },
        key: "startLocation",
        distanceField: "distance", 
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        _id: 1,
        distance: 1,
        name: 1
      }
    },    
    {
      $sort: { distance: 1 }
    }
  ]);  

  res.status(201).json({
    status: 'success',
    results: distances.length,
    params: {coords: { lat, lng}, unit},
    data: { 
      data: distances
    }
  });   
});

module.exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5} }
    },
    {
      $group: { 
        //_id: null, //no groups - aggregate for the entire collection
        _id: { $toUpper: "$difficulty"},
        countTours: {$sum: 1},
        numRatings: {$sum: "$ratingsQuantity"},
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }/*,
    {
      $match: { _id: {$ne: "EASY" } }
    }*/
  ]);

  res.status(201).json({
    status: 'success',
    data: { stats: stats }
  });    
});

module.exports.getMonthlyPlan = catchAsync(async (req, res, next) => {  
  const year = Number(req.params.year);
  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates"
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year+1}-01-01`)
        }
      }
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" }
      }
    },
    {
      $addFields: { 
        month: "$_id",
        year: year
      }
    },
    {
      $project: {
        _id: 0,
        month: 1,
        year: 1,
        numTourStarts: 1,
        tours: 1
      }
    },
    {
      $sort: { numTourStarts: -1, month: 1 }
    },      
    {
      $limit: 6 //take
    }
  ]);

  res.status(201).json({
    status: 'success',
    data: {
      plan: plan
    }
  });    
});



// module.exports.createTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.create(req.body);
  
//   res.status(201).json({
//     status: 'success',
//     data: { tour: tour }
//   });
// });


// module.exports.updateTour = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const tour = await Tour.findByIdAndUpdate(id, req.body, {
//     new: true,
//     runValidators: true
//   });

//   if(!tour) return next(new AppError("No tour found with that ID", 404));
  
//   res.status(201).json({
//     status: 'success',
//     data: { tour: tour }
//   });
// });

// module.exports.deleteTour = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const tour = await Tour.findByIdAndDelete(id);

//   if(!tour) return next(new AppError("No tour found with that ID", 404));

//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });

//module.exports.getTour = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const tour = await Tour.findById(id).populate({ path: "reviews" });

//   if(!tour) return next(new AppError("No tour found with that ID", 404));
    
//   res.status(200).json({
//     status: 'success',
//     data: { tour: tour}
//   });    
// });

// module.exports.getAllTours = catchAsync(async (req, res, next) => {
//   const features = new APIFeatures(Tour.find(), req.query);
//   features.filter().project().sort().paginate();
//   const tours = await features.query;
//   // .populate({
//   //   path: "guides",
//   //   select: "-__v -passwordChangedAt"
//   // });

//   res.status(200).json({
//     status: 'success',
//     result: tours.length,
//     //totalResult: count, 
//     data: { tours: tours }
//   });    
// });


// module.exports.checkId = (req, res, next, val) => {
//   next();
//   const tour = tours.find((el) => el.id === Number(val));
//   if (!tour) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Not Found',
//     });
//   }
//   next();
// };

// module.exports.checkBody = (req, res, next) => {
//   const tour = req.body;
//   if (!(tour.name && tour.price)) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name/price',
//     });
//   }
//   next();
// };
