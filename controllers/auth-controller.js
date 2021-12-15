const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user-model");
const catchAsync = require("../utils/catch-async");
const AppError = require("../utils/app-error");
const Email = require("../utils/email");
//const factory = require("./route-handler-factory");

// eslint-disable-next-line arrow-body-style
// const jwtsign = (payload, secret, options) => {
//   return new Promise( (resolve, reject) => {
//     jwt.sign(payload, secret, options, (err,token) =>{
//       if(err) return reject(err);
//       resolve(token);
//     });
//   });
// };

// // eslint-disable-next-line arrow-body-style
// const jwtverify = (token, secret, options) => {
//   return new Promise( (resolve, reject) => {
//     jwt.verify(token, secret, options, (err, decoded) =>{
//       if(err) return reject(err);
//       resolve(decoded);
//     });
//   });
// };

const createToken = (id) => promisify(jwt.sign)({id: id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
//const createToken = (id) => jwtsign({id: id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});

const verifyToken = (token) => promisify(jwt.verify)(token, process.env.JWT_SECRET);
//const verifyToken = (token) => jwtverify(token, process.env.JWT_SECRET);

const createAndSendToken = async (res, {statusCode, user, sendUser}) => {

  const token = await createToken(user._id);
  const cookieOptions =  {
    //will be deleted by the browser after whne expired
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000), 
    //cannot be accessed or modified in any way by the browser - browser can only receives, store, and send back
    httpOnly: true
  };

  //in prod - only sent over https
  if(process.env.NODE_ENV === "production")
      cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  if(user.password) user.password = undefined;
  if(user.active) user.active = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: token,
    ...(sendUser && {data: { user: user }})    
  });  

}

module.exports.signup = catchAsync( async (req, res, next) =>{
  //for security - sanitize input, and pass only expected data
  const { name, email, password, passwordConfirm, role } = req.body
  const newUser = await User.create({
    name, email, password, passwordConfirm, role
  });

  //const resetToken = newUser.createPasswordResetToken();
  const uploadPhotoURL = `${req.protocol==="https"?"https":"http"}://${req.get("host")}/me`;
  //console.log(uploadPhotoURL);
  await new Email(newUser, uploadPhotoURL).sendWelcome();

  await createAndSendToken(res, {statusCode:201, user:newUser, sendUser:true});
});

module.exports.signin = catchAsync( async (req, res, next) =>{
  //1) Get email, password from req.body
  const { email, password } = req.body;
  if(!(email && password)) return next(new AppError("Provide email and password", 400));  

  //2) Find the user in db
  const user = await User.findOne({email:email}).select("+password");
  if(!user) return next(new AppError("Invalid Credentials", 401));  

  //3) Verify password
  const pwd = await user.checkPassword(password, user.password);
  if(!pwd) return next(new AppError("Invalid Credentials", 401));  

  //4) Create token & send response
  await createAndSendToken(res, {statusCode:200, user:user})
});

module.exports.signout = (req, res, next) =>{
  const token = "loogedout";
  const cookieOptions =  {
    //will be deleted by the browser after whne expired
    expires: new Date(Date.now() - 10 * 1000), 
    //cannot be accessed or modified in any way by the browser - browser can only receives, store, and send back
    httpOnly: true
  };

  res.cookie("jwt", token, cookieOptions);

  res.status(200).json({
    status: 'success',
    message: "Logged out"
  });  
};

module.exports.protect = catchAsync(async (req, res, next) => {
  let token;
  //1a) Get jwt token - from authorization header
  if(!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    // eslint-disable-next-line no-unused-vars
    const [_,...header] = req.headers.authorization.split(" ");
    token = header.join(" ");
  }

  //1b) Get jwt token - from cookie
  if(!token && req.cookies.jwt) {
    // eslint-disable-next-line no-unused-vars
    token = req.cookies.jwt;
  }

  //1c) If no token found - error!
  if(!token) return next(new AppError("You are not logged in! Please log in to get access!", 401)); 

  //2) Vertify the token
  const decoded = await verifyToken(token);
  //console.log(decoded);

  //3) If token is valid, check if the user still exists
  const user = await User.findById(decoded.id);//.select("+password");
  if(!user) return next(new AppError("User no longer exists", 401)); 
  
  //4) If user exists, check if password was changed after JWT was issued (more general flag in the user record invalidating tokens?)
  const changed = user.checkChangedPassword(decoded.iat);
  if(changed) return next(new AppError("Password changed after token was issued. Please, log in again", 401)); 

  //5) Save user on the request 
  req.user = user;
  res.locals.user = user;

  //6) Accept request: next()
  next();
});

module.exports.isLoggedIn = async (req, res, next) => {
  try {
    //This only for redered pages - token should come ONLY from the cookie (not bearer auth header)
    if(req.cookies.jwt) {
      //Get token
      const token = req.cookies.jwt;
      //Verify token
      const decoded = await verifyToken(token);
      //Validate user base don id retrieved from token
      const user = await User.findById(decoded.id);
      if(!user) return next();
      //Check if token is not stale (compared to the most recent pwd change - if any)
      const changed = user.checkChangedPassword(decoded.iat);
      if(changed) return next(); 
      //There is a logged in user - add to res.locals
      //console.log("User is logged in");
      res.locals.user = user;
    }
  // eslint-disable-next-line no-empty
  } catch(err) {
  }
  finally {
    next();
  }
};

// eslint-disable-next-line arrow-body-style
module.exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if(roles.includes(req.user.role))
      return next();
    return next(new AppError("You are not authorized to perform this action", 403));   
  }
};

module.exports.forgotPassword = catchAsync(async (req, res, next) => {
  //retrieve email from the body
  const { email } = req.body;
  
  //find user with this email
  const user = await User.findOne({email:email});
  if(!user) return next(new AppError("There is no user with this email address", 404));  

  //create random token
  const resetToken = user.createPasswordResetToken();
  //console.log("User", user);

  //save user record
  await user.save({ validateBeforeSave: false});  

  try {
    //send back as email
    const resetURL = `${req.protocol==="https"?"https":"http"}://${req.get("host")}${req.baseUrl}/reset-password/${resetToken}`;    
    
    await new Email(user, resetURL).sendPasswordReset();
    // await sendEmail({
    //   email: user.email,
    //   subject: "Your password reset token (valid for 10 min)",
    //   message: `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}
    //   If you didn't forget your password, please ignore this email`
    // }); 

    res.status(200).json({
      status: 'success',
      message: "Password Reset email sent"
    });
  } catch(err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false}); 

    return next(new AppError("Error sending Password Reset Email. Try again later!", 500));  
  }
});

module.exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) retrieve token, password from message body
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  //2) get user based on token 
  const user = await User.findOne({passwordResetToken: hashedToken, passwordResetExpires: {$gt: Date.now()}});
  //const user = await User.findOne({passwordResetToken: hashedToken}); 
  if(!user) return next(new AppError("Token is invalid or has expired", 400));  
  
  //3) check token expiration
  // if(user.passwordResetExpires < Date.now()) 
  //   return next(new AppError("Password Reset Token Expired. Please, request a new one", 404));  
  
  //4) update password, pwd changedAt, remove token
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;  
  await user.save();  

  //5) Log the user in 
  await createAndSendToken(res, {statusCode:201, user:user})

});

module.exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) protected route - for logged in users only - req.user will contain user document
  const { passwordCurrent, password, passwordConfirm} = req.body;
  //const { user } = req;

  //2) verify old password
  const user = await User.findById(req.user._id).select("+password");
  const pwd = await user.checkPassword(passwordCurrent, user.password);
  if(!pwd) return next(new AppError("Invalid Credentials", 401)); 

  //3) assign new password & password confirm to user 
  user.password = password;
  user.passwordConfirm = passwordConfirm;

  //console.log(user, password, passwordConfirm);

  //4) save
  await user.save();

  //5) generate & return token
  await createAndSendToken(res, {statusCode:201, user:user})
});  