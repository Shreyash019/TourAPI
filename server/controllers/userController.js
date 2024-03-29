const UserModel = require('./../models/userModel');
const TourModel = require('./../models/tourModel');
const crypto = require('crypto');
const ErrorHandler = require('../utils/errorHandler');
const CatchAsync = require('../middleware/catchAsync');
const authToken = require('../utils/authToken');
const mail = require('../middleware/sendMail');
const blogModel = require('../models/blogModel');
const cloudinary = require('cloudinary');


// User Registrayion 
exports.userRegistration = CatchAsync(async(req, res, next)=>{
    const {name, email, password} = req.body;
    if(!name || !email || !password){
        return res.send('Please Enter Details')
    }
    const existUser = await UserModel.findOne({email});
    if(existUser){
        return res.status(200).send(`User Already exist`)
    }
    const user = await UserModel.create({
        name, email, password,
    })
    authToken.sendToken(user, 200, res)
})


// User Login
exports.userLogin = CatchAsync(async(req, res, next)=>{
    const {email, password} = req.body;
    if(!email || !password){
        return next(new ErrorHandler(`Please enter email and password`, 400));
    }

    const user = await UserModel.findOne({email}).select("+password");

    if(!user || !await user.correctPassword(password, user.password)){
        return next(new ErrorHandler(`Invalid email and password`, 401))
    }
    authToken.sendToken(user, 200, res)
})


// User Logout
exports.userLogout = CatchAsync(async(req, res, next)=>{
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    })
    res.status(200).json({
        success: true,
        message: 'User Logged Out.'
    })
})


// User password update
exports.userPasswordUpdate= CatchAsync(async(req, res, next)=>{
    const user = await UserModel.findById(req.user.id).select("+password");

    const passwordMatch = await user.correctPassword(req.body.oldPassword, user.password);
    if(!passwordMatch){
        return next(new ErrorHandler('Old password is incorrect', 400))
    }

    if(req.body.newPassword !== req.body.confirmPassword){
        return next(new ErrorHandler('Password not matched.', 400))
    }

    user.password = req.body.newPassword;
    await user.save()

    authToken.sendToken(user, 200, res)
})


// User password reset
exports.resetUserPassword = CatchAsync(async(req, res, next)=>{
    // Creating token hash
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await UserModel.findOne({
        resetPasswordToken,
        resetPasswordExpire: {$gt: Date.now()}
    })

    if(!user){
        return next(new ErrorHandler("Reset password token is invalid or has been expired", 404));
    }

    if(req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandler("Password doesn't matched.", 404));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save()
    authToken.sendToken(user, 200, res)
})


// User password forgot 
exports.setForgotPassword = CatchAsync(async(req, res, next)=>{
    console.log(req.body)
    const user = await UserModel.findOne({email: req.body.email})
    console.log(user)

    if(!user){
        
        console.log('No')
        res.status(200).json({
            success: false,
            message: `User doesn't exist with id ${req.body.email}.`
        })
        return next(new ErrorHandler("User not found", 404));
    }
    // Get ResetPasswordToken
    const resetToken = await user.getResetPasswordToken();

    await user.save({validateBeforeSave: false});

    const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;

    const message = `Your password reset token is:- \n\n ${resetPasswordUrl}, \n\n If you have not request this email then please ignore it.`;

    try{
        await mail.sendEmail({
            email: user.email,
            subject: `Tour&Blog password recovery.`,
            message,
        })
        res.status(200).json({
            success: true,
            message: `Email send to ${user.email}.`
        })
    } catch(err){
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({validateBeforeSave: false});
        return next(new ErrorHandler(err.message, 500))
    }
})


// User Profile 
exports.getUserProfile = CatchAsync(async(req, res, next)=>{
    const user = await UserModel.findById(req.user.id);
    res.status(200).json({
        sncess: true,
        user
    })
})


// User Profile Update
exports.updateUserProfile = CatchAsync(async(req, res, next)=>{

    const user = await UserModel.findByIdAndUpdate(req.user.id, req.body, {
        new: true,
        runValidators: true,
        userFindAndModify: true
    });
    res.status(200).json({
        sucess: true,
        user,
    })
})

// User Profile Update
exports.updateUserProfileImage = CatchAsync(async(req, res, next)=>{
    const myCloud = await cloudinary.v2.uploader.upload(req.body.profileImage, {
        folder: "profileImage",
        width:150,
        crop: "scale"
    })

    const user = await UserModel.findByIdAndUpdate(req.user.id, {
        profileImage:{
            public_id: myCloud.public_id,
            url: myCloud.secure_url
        }
    }, {
        new: true,
        runValidators: true,
        userFindAndModify: true
    });
    // const authorData = {
    //     authorName: req.body.name
    // }
    res.status(200).json({
        sucess: true,
        user
    })
})


// User Account Delete
exports.userAccountDelete = CatchAsync(async(req, res, next)=>{
    const user = await UserModel.findById(req.user.id);
    if(!user){
        return next(new ErrorHandler(`User does not exist with ID: ${req.params.id}`))
    }

    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    })

    const deletedUser = await user.remove()
    res.status(200).json({
        suncess: true,
        message: 'User Deleted',
        deletedUser
    })
})


// Getting tour history


// Getting upcomming tour




// Admin Routes
exports.getAllUserAvailableInSystemByAdmin = CatchAsync(async(req, res, next)=>{

    const users = await UserModel.find();
    if(!users){
        return next(new ErrorHandler(`Users doesn't exist`, 404))
    }
    res.status(200).json({
        suncess: true,
        length: users.length,
        data: {users}
    })
})

// Admin get a User detail
exports.getSingleUserDetailByAdmin = CatchAsync( async(req, res, next)=>{
    const user = await UserModel.findById(req.params.id);
    if(!user){
        return next(new ErrorHandler(`User does not exist with ID: ${req.params.id}`))
    }
    res.status(200).json({
        success: true,
        user
    })
})


exports.getSingleTourDetailByAdmin = CatchAsync( async(req, res, next)=>{
    const tour = await TourModel.findById(req.params.id);
    if(!tour){
        return next(new ErrorHandler(`User does not exist with ID: ${req.params.id}`))
    }
    res.status(200).json({
        success: true,
        tour
    })
})

exports.updateUserAccountAvailableInSystemByAdmin = CatchAsync(async(req, res, next)=>{
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
    }
    const user = await UserModel.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        userFindAndModify: true
    });
    res.status(200).json({
        suncess: true,
        user
    })
})

exports.updateTourAvailableInSystemByAdmin = CatchAsync(async(req, res, next)=>{
    const tour = await TourModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        userFindAndModify: true
    });
    res.status(200).json({
        suncess: true,
        tour
    })
})

exports.deleteUserAccountFromSystemByAdmin = CatchAsync(async(req, res, next)=>{
    const user = await UserModel.findById(req.params.id);
    if(!user){
        return next(new ErrorHandler(`User does not exist with ID: ${req.params.id}`))
    }
    const deletedUser = await user.remove()
    res.status(200).json({
        suncess: true,
        message: 'User Deleted',
        deletedUser
    })
})

exports.deleteTourFromSystemByAdmin = CatchAsync(async(req, res, next)=>{
    const tour = await TourModel.findById(req.params.id);
    if(!tour){
        return next(new ErrorHandler(`Tour does not exist with ID: ${req.params.id}`))
    }
    const deletedTour = await tour.remove()
    res.status(200).json({
        suncess: true,
        message: 'User Deleted',
        deletedTour
    })
})