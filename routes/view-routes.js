const express = require('express');

const viewController = require('../controllers/view-controller');
const authController = require('../controllers/auth-controller');
//const bookingController = require('../controllers/booking-controller');

const router = express.Router();

//router.use(viewController.setCSPHeaders);
//router.use(authController.isLoggedIn);

router.use(viewController.alerts);

//we use webhooks - remove bookingController.createBookingCheckout
//router.get("/", bookingController.createBookingCheckout, authController.isLoggedIn, viewController.getOverview);
router.get("/", authController.isLoggedIn, viewController.getOverview);
router.get("/tour/:slug", authController.isLoggedIn, viewController.getTour);
router.get("/login", authController.isLoggedIn, viewController.getLoginForm);
router.get("/me", authController.protect, viewController.getAccount);
router.get("/my-tours", authController.protect, viewController.getMyTours);
router.post("/submit-user-data", authController.protect, viewController.updateUserData);

module.exports = router;