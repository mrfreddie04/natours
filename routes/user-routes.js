const express = require('express');

const userController = require('../controllers/user-controller');
const authController = require('../controllers/auth-controller');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/signout', authController.signout);
router.post('/forgot-password', authController.forgotPassword); //would receive user-email from the client
router.patch('/reset-password/:token', authController.resetPassword); //would receive pwd reset token & new password from the client

//Authentication is required from here on
router.use(authController.protect);

router.patch('/change-password', authController.updatePassword);
router.patch(
  '/update-me', 
  userController.uploadUserPhoto, 
  userController.resizeUserPhoto, 
  userController.updateMe
);
router.delete('/delete-me', userController.deleteMe);
router.get('/me', userController.getMe, userController.getUser);

//Authorization (as admin) is required from here on
router.use(authController.restrictTo("admin"));

router.route('/')
  .post(userController.createUser)
  .get(userController.getAllUsers);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
