import connect from "@/config/database";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import otpGenerator from 'otp-generator'
import { sendMail } from "@/config/nodemailer"

connect();

type Props = {
  to: string,
  subject: string,
  html: string
}

export async function POST (req:NextRequest) {
  function generateOtp() {
    return otpGenerator.generate(4, { upperCaseAlphabets: false,lowerCaseAlphabets :false, specialChars: false });
  }
  try {
    const reqData = await req.json();
    const { email } = reqData;
    if (!reqData) {
      return NextResponse.json({ success: false, message: 'Request body is empty or invalid' });
    }
    const user = await User.findOne({ email })
    if(!user) {
      return NextResponse.json({ success: false, message: 'User with this email not found' })
    }
    const otp = generateOtp();
    user.otp = otp;
    await user.save();
    const props:Props = {
      to:user.email,
      subject:"Otp for login",
      html:
      `
        <h1>OTP verifition</h1>
        <h3>Hello ${user.name}</h3>
        <p>Your OTP for login on Trackit is: ${user.otp}</p>
      `
    }
    console.log('Sending otp')
    await sendMail(props)
    console.log('OTP send successfully')
    return NextResponse.json({success:true,message:"Otp sent successfully"})
  } catch (error) {
    console.log(error)
    return NextResponse.json({ success: false, message: 'Unable to generate OTP' })
  }
}

export async function GET (req:NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const otp = searchParams.get('otp');
    const email = searchParams.get('email');
    console.log({email, otp});
    if(!email || !otp) {
      console.log('Email or OTP not found');
      return;
    }
    const user = await User.findOne({ email});
    if(!user) {
      return NextResponse.json({ success: false, message: 'Server error please try after sometime' })
    }
    if(user.otp == otp) {
      user.password = undefined;
      user.otp = undefined;
      user.role = undefined;
      user.accountVerified = undefined;
      console.log('Otp validated successfully')
      const res = NextResponse.json({ success: true, data: user, message: "Login successful" }, { status: 200 });
      res.cookies.set('user',user.email,{
        httpOnly:true,
        maxAge:24*60*60,
        path:'/'
      })
      return res;
    } else {
      console.log('Invalid OTP')
      return NextResponse.json({ success: false, message: 'Invalid OTP' })
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error while processing otp' })
  }
}