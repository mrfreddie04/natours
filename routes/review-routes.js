const express = require("express");
const reviewController = require('../controllers/review-controller');
const authController = require('../controllers/auth-controller');

const router = express.Router({mergeParams: true});

//Authentication is required for all reviews routes
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.setQueryParams, reviewController.getAllReviews)
  .post(
    authController.restrictTo("user"), 
    reviewController.setTourAndUserIds, 
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(authController.restrictTo("user","admin"), reviewController.deleteReview)
  .patch(authController.restrictTo("user","admin"), reviewController.updateReview);

module.exports = router;