import mongoose from "mongoose";
import 'dotenv/config'; // This already loads .env variables
import connectDB from "./bd/index.js";

import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({ path: './env' });

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`server is running at port: ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed !! ",err)
})









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