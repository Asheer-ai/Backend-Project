import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilepath)=> {
    try {
        if(!localFilepath) return null;
        //upload the file on cloudinary
        const response=cloudinary.uploader.upload(localFilepath,{
            resource_type:"auto"
        })
        //file has been uploaded successfull 
        //console.log("file is uploaded on cloundinary", response.url)
        fs.unlinkSync(localFilepath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilepath)//remove the locally saved temporary file as the upload operation got filed
        return null;
    }
}

export {uploadOnCloudinary}