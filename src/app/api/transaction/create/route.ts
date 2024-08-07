import connect from "@/config/database";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/config/nodemailer";

connect();

type Props = {
  to: string,
  subject: string,
  html: string
}

// Make a payment
export async function POST(req: NextRequest) {
  try {
    const reqData = await req.json();
    let { amount, from, to } = reqData;

    if (!amount || !from || !to) {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 });
    }

    if(from == to){
      throw new Error('Invalid request')
    }

    console.log({from, to});

    const user1 = await User.findOne({accountNo:from});
    const user2 = await User.findOne({accountNo:to});

    if (!user2) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const transactionAmount = parseFloat(amount);

    if (isNaN(transactionAmount)) {
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
    }

    from = {
      name:user1.name,
      email:user1.email,
      accountNo:user1.accountNo
    }

    to = {
      name:user2.name,
      email:user2.email,
      accountNo:user2.accountNo
    }

    const newAmount1 = parseFloat(user1.balance) - transactionAmount;
    const newAmount2 = parseFloat(user2.balance) + transactionAmount;

    user1.balance = newAmount1;
    user2.balance = newAmount2;

    const props1:Props = {
      to:user1.email,
      subject:"Transaction details from Trackit",
      html:`
      <h1>Hello! ${user1.name}</h1>
      <p>Dear customer your account ${user1.accountNo} is debited INR ${transactionAmount}</p>
      <p>Your current balance is ${user1.balance}</p>
      `
    }
    await sendMail(props1)
    const props2:Props = {
      to:user1.email,
      subject:"Transaction details from Trackit",
      html:`
      <h1>Hello! ${user2.name}</h1>
      <p>Dear customer your account ${user2.accountNo} is credited INR ${transactionAmount}</p>
      <p>Your current balance is ${user2.balance}</p>
      `
    }
    await sendMail(props2)

    const transaction = await Transaction.create({ amount: transactionAmount, from, to ,status:"completed"});

    user1.transactions.push(transaction._id);
    user2.transactions.push(transaction._id);

    await user1.save();
    await user2.save();

    return NextResponse.json({ success: true, message: "Transaction completed", transaction }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: "Unable to process transaction" }, { status: 500 });
  }
}
