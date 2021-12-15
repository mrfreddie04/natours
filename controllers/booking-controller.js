const Stripe = require("stripe");
const catchAsync = require("../utils/catch-async");
const factory = require("./route-handler-factory");
const Tour = require('../models/tour-model');
const Booking = require('../models/booking-model');
const AppError = require("../utils/app-error");

module.exports.createBooking = factory.createOne(Booking);
module.exports.updateBooking = factory.updateOne(Booking);
module.exports.deleteBooking = factory.deleteOne(Booking);
module.exports.getBooking = factory.getOne(Booking);
module.exports.getAllBookings = factory.getAll(Booking);

module.exports.isMyBooking = catchAsync( async(req, res, next) => {
  const { id } = req.params;
  const booking = await Booking.findById(id);
  
  if( String(req.user._id) !== String(booking.user._id)) {
    return next(new AppError("This booking does not belong to you!", 401)); 
  }  
  next();
});

let stripe; 
module.exports.getCheckoutSession = catchAsync( async (req, res, next) => {
  if(!stripe) {
    //console.log("SSK",process.env.STRIPE_SECRET_KEY);
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  }
  //get tour to be booked
  const { tourid } = req.params;
  const tour = await Tour.findById(tourid);

  //create checkout session (from stripe)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: 
      `${req.protocol==="https"?"https":"http"}://${req.get("host")}/?user=${req.user._id}&tour=${tourid}&price=${tour.price }`,
    cancel_url: `${req.protocol==="https"?"https":"http"}://${req.get("host")}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: tourid,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        //must be live images (hosted on the internet) 
        images: [
          `https://www.natours.dev/img/tours/${tour.imageCover}`
        ],
        amount: tour.price * 100,
        currency: "usd",
        quantity: 1
      }
    ]
  });

  //send session to the client
  res.status(201).json({
    status: 'success',
    session: session
  });   

});

module.exports.createBookingCheckout = catchAsync( async(req, res, next) => {
  //Temporary, because unsecure - anyone could create bookings by creating QS on the GET "/" request
  const { user, tour, price } = req.query;
  //console.log(user ? "Booking" : "Regular");
  if(!user || !tour || !price) return next();

  await Booking.create({user, tour, price});

  //remove QS params by redirecting to the same URL but wout QS part
  res.redirect(req.originalUrl.split("?")[0]);
});


module.exports.getMyBookings = catchAsync( async (req, res, next )  => {
  const user = req.user._id;

  //1) Find all bookings
  const bookings = await Booking.find({user:user});

  //2)Create array of IDs
  const tourIds = bookings.map( booking => booking.tour._id);

  //2) Find tours with the returned IDs
  const tours = await Tour
    .find({_id: { $in: tourIds } })
    .select("name duration difficulty summary");

  res.status(200).json( {
    status: 'success',
    bookings: tours
  });  
});