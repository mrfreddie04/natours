const Stripe = require("stripe");
const catchAsync = require("../utils/catch-async");
const factory = require("./route-handler-factory");
const Tour = require('../models/tour-model');
const Booking = require('../models/booking-model');
const User = require('../models/user-model');
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

module.exports.getCheckoutSession = catchAsync( async (req, res, next) => {
  // if(!stripe) {
  //   //console.log("SSK",process.env.STRIPE_SECRET_KEY);
  //   const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  // }
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  //get tour to be booked
  const { tourid } = req.params;
  const tour = await Tour.findById(tourid);

  //create checkout session (from stripe)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${req.protocol==="https"?"https":"http"}://${req.get("host")}`,
    //now handled by stripe webhook
    //success_url: 
    //`${req.protocol==="https"?"https":"http"}://${req.get("host")}/?user=${req.user._id}&tour=${tourid}&price=${tour.price }`,
    cancel_url: `${req.protocol==="https"?"https":"http"}://${req.get("host")}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: tourid,
    line_items: [
      {
        quantity: 1,
        price_data: {
          unit_amount: tour.price * 100,
          currency: "usd",
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            //must be live images (hosted on the internet) 
            images: [
              `https://www.natours.dev/img/tours/${tour.imageCover}`
            ]
          }
        }
      }
    ]
  });

  //send session to the client
  res.status(201).json({
    status: 'success',
    session: session
  });   

});

//now needed - handled by webhookCheckout
// module.exports.createBookingCheckout = catchAsync( async(req, res, next) => {
//   //Temporary, because unsecure - anyone could create bookings by creating QS on the GET "/" request
//   const { user, tour, price } = req.query;
//   //console.log(user ? "Booking" : "Regular");
//   if(!user || !tour || !price) return next();

//   await Booking.create({user, tour, price});

//   //remove QS params by redirecting to the same URL but wout QS part
//   res.redirect(req.originalUrl.split("?")[0]);
// });

const createBookingCheckout =  async(session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({email:session.customer_email}))._id;
  //const price = session.line_items[0].amount/100;
  const price = session.amount_total/100;

  await Booking.create({user, tour, price});
};

module.exports.webhookCheckout = catchAsync( async(req, res, next) => {
  //get access to stripe library
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  //read stripe signature from headers
  const signature = req.headers["stripe-signature"];

  //to handle errors resulting from incorrect secret or corrupted signature
  let event;
  try {
    //create stripe event 
    event = stripe.webhooks.constructEvent(
      req.body, 
      signature, 
      process.env.STRIPE_WEBHOOK_SECRET);
  } catch(err) {
    //send back error to STRIPE - stripe will receive this messgae, because this request was originated by stripe!
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  //check if this is the event we want to handle - name of event (as per events we selected to be handled by this webhook)
  if(event.type === "checkout.session.completed") {
    await createBookingCheckout(event.data.object); //pass session data
  } else {
    console.log(`Unhandled event type ${event.type}`);
  }

  //acknowledge receipt of the event
  res.status(200).json({received: true});
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