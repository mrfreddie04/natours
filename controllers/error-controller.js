const AppError = require("../utils/app-error");

const sendErrorDev = (err, req, res) => {
  if(req.originalUrl.startsWith("/api")) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  } else {
    console.error("Error", err);
    res.status(err.statusCode).render("error",{
      title: "Something went wrong!",
      message: err.message
    })
  }
}

/* eslint-disable */
const sendErrorProd = (err, req, res) => {
  if(req.originalUrl.startsWith("/api")) {
    if(err.isOperational) {
      //Operational error that we trust
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });    
    } else {
      //Programming or unknown error - we do not want to leak the details to the client
      //1) Log to the log - should use a logging library (in real app):
      console.error("Error", err);
      //2) Send a generic message to the user
      return res.status(500).json({
        status: "error",
        message: "Something went wrong"
      });        
    }
  } else {
    // eslint-disable-next-line no-lonely-if
    if(err.isOperational) {
      //Operational error that we trust
      return res.status(err.statusCode).render("error",{
        title: "Something went wrong!",
        message: err.message
      });
    } else {
      //Programming or unknown error - we do not want to leak the details to the client
      //1) Log to the log - should use a logging library (in real app):
      console.error("Error", err);
      //2) Send a generic message to the user
      return res.status(500).render("error",{
        title: "Something went wrong!",
        message: "Please try again later."
      });        
    }
  }      
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);  //bad request
}

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);  //bad request
}

const handleValidationErrorsDB = (err) => {
  const messages = Object.values(err.errors)
    //.filter( value => value.name === "ValidatorError" && !!value.message)
    .map( value => value.message) ;
  return new AppError(`Invalid input data. ${messages.join(". ")}`, 400);  //bad request
}

// eslint-disable-next-line arrow-body-style
const handleJWTError = () => new AppError(`Invalid token. Please log in again`, 401);  

const handleJWTExpired = () => new AppError(`Token expired. Please log in again`, 401);  

module.exports = (err, req, res, next)=>{
  //Set defaults
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if(process.env.NODE_ENV === "development") {
    sendErrorDev(err,req, res);  
  } else {
    let error; 
    if(err.name === "CastError") 
      error = handleCastErrorDB(err);
    else if(err.code === 11000)
      error = handleDuplicateFieldsDB(err);
    else if(err.name === "ValidationError" && err.errors) 
      error = handleValidationErrorsDB(err);
    else if(err.name === "JsonWebTokenError") 
      error = handleJWTError();    
    else if(err.name === "TokenExpiredError") 
      error = handleJWTExpired();         

    sendErrorProd(error || err, req, res);
  }
}