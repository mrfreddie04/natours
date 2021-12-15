const path = require("path");
const express = require('express');
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require('morgan');
const cors = require("cors");
//const bodyParser = require('body-parser');
const compression = require("compression");

const AppError = require("./utils/app-error");
const cspConfig = require("./utils/csp-config");
const globalErrorHandler = require("./controllers/error-controller");

const tourRouter = require('./routes/tour-routes');
const userRouter = require('./routes/user-routes');
const reviewRouter = require('./routes/review-routes');
const bookingRouter = require('./routes/booking-routes');
const viewRouter = require('./routes/view-routes');
const bookingController = require("./controllers/booking-controller");

//Create express app
const app = express();

//Make our app trust proxies (heroku acts as a proxy)
app.enable('trust proxy');

//1. Express settings - set up template engine
app.use(cors());

//similar to app.get(), app.post()
//it is not to set any options, but to respons to options request
app.options("*",cors());

app.set("view engine","pug");
app.set("views",path.join(__dirname,"views"));

//2. Global Middlewares - applicable to ALL routes
//Enable access to static files
app.use(express.static(path.join(__dirname,"public")));

//Set Security HTTP Headers
app.use(helmet(cspConfig));

//Enable Development Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

//Limiter Reuests from the same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP. Please try again later!"
});
app.use("/api",limiter);

//add raw body parsing for this route
app.post(
  "/webhook-checkout", 
  express.raw({type:"application/json"}), 
  bookingController.webhookCheckout
);

//Parse data from body (of ajax/json request) into req.body
app.use(express.json({limit: "10kb"}));
//Parse data from body (of a form being send with URL encoding) into req.body
app.use(express.urlencoded({extended: true, limit: "10kb"}));

//Parse data from cookies into req.cookies
app.use(cookieParser());

//Data Sanitization - clean data stored in req.body
app.use(mongoSanitize()); //NoSQL injection
app.use(xss()); //XSS - filters out js from html provided by user, 

//Prevent Parameter Pollution - cleans up QS
app.use(hpp({
  whitelist: [
    "duration","ratingsAverage","ratingsQuantity","name","maxGroupSize","difficulty","price"
  ]
}));

app.use(compression());

//Test Middleware - Add request timestamp to request
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//2b. Mount API Routers
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//2a. Mount View Routers
app.use("/", viewRouter);

//3. Handle unhandled routes
app.all('*', (req, res, next)=>{
  next(new AppError(`Can't find ${req.originalUrl}`, 404)); 
});

//4. Set up global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
