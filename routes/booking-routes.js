const express = require('express');
const bookingController = require('../controllers/booking-controller');
const authController = require('../controllers/auth-controller');

const router = express.Router();

router.use(authController.protect);

router.get("/checkout-session/:tourid", bookingController.getCheckoutSession);
router.get("/my-tours", bookingController.getMyBookings);

router.use(authController.restrictTo("admin", "lead-guide"));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);    

module.exports = router;
