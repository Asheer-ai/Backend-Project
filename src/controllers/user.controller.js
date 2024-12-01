import {asyncHandler} from "../utils/asyncHandle.js"

const registerUser=asyncHandler(async(req,res)=>{
    res.status(200).json({
        message:"Badi baat cheet indusrty kai logon sai"
    })
})

export {registerUser}