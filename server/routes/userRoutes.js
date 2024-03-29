const express = require('express');
const router = express.Router();
const userController = require('./../controllers/userController');
const authToken = require('./../utils/authToken');

// User Sign up, sign in, logout routes
router.route('/user/signup').post(userController.userRegistration);
router.route('/user/login').post(userController.userLogin);
router.route('/user/logout').get(userController.userLogout);

// User Password change routes
router.route('/user/password/update').put(authToken.isUserAuthenticated, userController.userPasswordUpdate);
router.route('/user/password/reset/:token').put(userController.resetUserPassword);
router.route('/user/password/forgot').post(userController.setForgotPassword);

// User Profile routes
router.route('/user/profile').get(authToken.isUserAuthenticated ,userController.getUserProfile);
router.route('/user/update/profile').put(authToken.isUserAuthenticated, userController.updateUserProfile)
router.route('/user/update/image').put(authToken.isUserAuthenticated, userController.updateUserProfileImage)
router.route('/user/account/delete').delete(authToken.isUserAuthenticated, userController.userAccountDelete)


// Admin routes
router.route('/admin/users').get(authToken.isUserAuthenticated, authToken.isUserAdmin("master"), userController.getAllUserAvailableInSystemByAdmin);
// All tour will be fetched from tour route
router.route('/admin/user/:id')
    .get(authToken.isUserAuthenticated, authToken.isUserAdmin("master"), userController.getSingleUserDetailByAdmin)
    .put(authToken.isUserAuthenticated, authToken.isUserAdmin("master"), userController.updateUserAccountAvailableInSystemByAdmin)
    .delete(authToken.isUserAuthenticated,authToken.isUserAdmin("master"), userController.deleteUserAccountFromSystemByAdmin);
router.route('/admin/tour/:id')
    .get(authToken.isUserAuthenticated, authToken.isUserAdmin("master"), userController.getSingleTourDetailByAdmin)
    .put(authToken.isUserAuthenticated, authToken.isUserAdmin("master"), userController.updateTourAvailableInSystemByAdmin)
    .delete(authToken.isUserAuthenticated, authToken.isUserAdmin("master"), userController.deleteTourFromSystemByAdmin);

module.exports = router