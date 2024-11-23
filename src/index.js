import mongoose from "mongoose";
import 'dotenv/config'; // This already loads .env variables
import connectDB from "./bd/index.js";

import dotenv from "dotenv";

dotenv.config({ path: './env' });

connectDB();

/*
import express from "express";
const app=express()

(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("application is not able to talk to database",error)
            throw error;
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    }catch(error){
        console.log("Error:",err)
        throw err
    }
})()
    */