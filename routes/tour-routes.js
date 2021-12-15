const express = require('express');
const tourController = require('../controllers/tour-controller');
const authController = require('../controllers/auth-controller');
const reviewRouter = require('./review-routes');

const router = express.Router();

//Route specific middleware for parameterized routes
//router.param('id', tourController.checkId);

//delegate to reviewRouter
router.use("/:tourid/reviews", reviewRouter);

router
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router
  .route('/tour-stats')
  .get(tourController.getTourStats);  

router
  .route('/monthly-plan/:year')
  .get(authController.protect, authController.restrictTo("admin","lead-guide","guide"), tourController.getMonthlyPlan);   
  
router
  .route("/tours-within/:distance/center/:coords/unit/:unit")  
  .get(tourController.getToursWithin);

router
  .route("/distances/:coords/unit/:unit")  
  .get(tourController.getDistances);  

router
  .route('/')
  .get(tourController.getAllTours)
  .post(authController.protect, authController.restrictTo("admin","lead-guide"), tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
      authController.protect, 
      authController.restrictTo("admin","lead-guide"),
      tourController.uploadTourImages,
      tourController.resizeTourImages,
      tourController.updateTour
    )
  .delete(authController.protect, authController.restrictTo("admin","lead-guide"), tourController.deleteTour);

// router
//   .route('/:tourid/reviews')  
//   .post(authController.protect, authController.restrictTo("user"), reviewController.createReview);

module.exports = router;
