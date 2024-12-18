import {asyncHandler} from "../utils/asyncHandle.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudnary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens=async(userId)=>{
    try { 
        const user=await User.findById(userId)
        const acessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return{acessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}

const registerUser=asyncHandler(async(req,res)=>{
    //get user detail from frontend
    //validation-not empty
    //check if user already exists:- username,email
    //check for image,avtar
    //upload them to cloudinary
    //create user object-create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return res


    const {fullname,email,username,password } =req.body
    // console.log("email: ",email);

    if(
        [fullname,email,username,password].some((field)=>
            field?.trim()==="")
    ){
        throw new ApiError(400,"fullname is required")
    }
    const exsitedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(exsitedUser){
        throw new ApiError(409,"User with email or username already exists")
    }
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath= req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar file is required')
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,'Avatar file is required')
    }


    const user=await User.create({
        fullname,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registring the user");
        
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User regisyered Successfully")
    )

})

const loginUser=asyncHandler(async(req,res)=>{
    //req body->data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookie

    const {email,username,password}=req.body

    if(!(username || email)){
        throw new ApiError(400,"Username or password is required")
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User doesnot exists")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Password doesnot match")
    }

    const {acessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("accessToken",acessToken,options).cookie("refreshToken",refreshToken,options).json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,acessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )
})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("acessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User Logged Out"))
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken= jwt.verify(
            incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
        )
    
        const user=User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newRefreshToken,options).json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access tken refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldpassword,newPassword}=req.body

    const user=User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldpassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse (200,req.user,"current user fetched successfully"))
})

const updateAccountDetails=asyncHandler(async (req,res) => {
    const {fullname,email}=req.body

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required");
    }

    const user=User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing");
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated successfully ")
    )
})


const upadetUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImagePath=req.file?.path

    if(!coverImagePath){
        throw new ApiError(400,"Avatar file is missing");
    }
    const coverImage= await uploadOnCloudinary(coverImagePath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"cover Image updated successfully ")
    )
})


const getUserChannelProfile=asyncHandler(async (req,res) => {
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel= await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },{
            $lookup:{
                from:"subsciptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },{
            $lookup:{
                from:"subsciptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },{
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },{
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel does not exists")
    }

    return res.status(200).json(
        new ApiResponse(404,"Channel does not exists")
    )
})

export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,upadetUserCoverImage,getUserChannelProfile }






