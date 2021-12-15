const path = require("path");
const sharp = require("sharp");
const multer = require("multer");
const catchAsync = require("../utils/catch-async");
const AppError = require("../utils/app-error");
const User = require("../models/user-model");
const factory = require("./route-handler-factory");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  allowedFields.forEach( field => {
    if(field in obj) newObj[field] = obj[field];
  });
  return newObj;
}

// const multerStorage =  multer.diskStorage({  
//   destination: (req, file, cb) => {
//     cb(null, "public/img/users");
//   },
//   filename: (req, file, cb) => {
//     //To generate unique filename: user-user.id-timestamp.ext
//     const ext = file.mimetype.split("/").pop();
//     const fileName = `user-${req.user._id}-${Date.now()}.${ext}`;
//     cb(null, fileName);
//   },  
// });
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  //test if the file has proper extension
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
module.exports.uploadUserPhoto = upload.single("photo");

//create image transformation middleware
module.exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if(!req.file) return next();

  //memoryStorage does not set file.filename
  //we need to set req.file.filename for the next middleware function to save the image path to DB!
  //extension is fixed to jpeg now
  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({quality: 90})
    .toFile(path.join("public/img/users", req.file.filename)); //path is relative to process.cwd()

  next();
});

module.exports.deleteUser = factory.deleteOne(User);
module.exports.updateUser = factory.updateOne(User);
module.exports.getUser = factory.getOne(User);
module.exports.getAllUsers = factory.getAll(User);

module.exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Error if trying to update password
  if(req.body.password || req.body.passwordConfirm) 
    return next(new AppError("You cannot update password via this route. Please use /change-password",400));
    
  //2) Update user
  const filteredBody = filterObj(req.body,"name","email");  
  if(req.file) filteredBody.photo = req.file.filename; // Update photo
  const updatedUser = await User.findByIdAndUpdate( 
    req.user._id,
    filteredBody,
    { 
      new: true, //return update object
      runValidators: true //run validators - email address
    }
  );

  res.status(201).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

module.exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate( 
    req.user._id,
    { active: false}
  );

  res.status(204).json({
    status: 'success',
    data: null
  });
});

module.exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not implemented. Please use /signup instead',
  });
};

module.exports.getMe = (req, res, next)=> {
  req.params.id = req.user._id;
  next();
};