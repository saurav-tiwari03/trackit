"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import axios from "axios";
import { useEffect, useState } from "react"
import { TbLoader } from "react-icons/tb";
import {useRouter} from 'next/navigation'
import Link from "next/link";


export default function Page () {

  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');  
  const [balance,setBalance] = useState('');
  const [pin,setPin] = useState('');
  const [loading,setLoading] = useState(false);
  const role = "user"
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (user) {
      router.push('/')
    }
  })

  const signupHandler = async(e:any) => {
    e.preventDefault();
    setLoading(true)
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`,{name,email,role,password,balance,pin})
      console.log(response.data)
      const data = response.data
      localStorage.setItem('user',JSON.stringify(data.data))
      router.push('/')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (  
    <div className="flex items-center justify-center h-screen">
      <div className="border-2 border-[#1e293b] p-12 w-[400px]">
        <h2 className="text-3xl font-Poppins my-4">Signup</h2>
        <div className="flex items-start flex-col justify-start gap-4" >
          <div className="flex items-center gap-2 justify-between w-full">
            <Label>Name</Label>
            <Input className="w-[200px]" placeholder="Enter name" onChange={(e) => setName(e.target.value)}/>
          </div>
          <div className="flex items-center gap-2 justify-between w-full">
            <Label>Email </Label>
            <Input className="w-[200px]" placeholder="Enter email" onChange={(e) => setEmail(e.target.value)}/>
          </div>
          <div className="flex items-center gap-2 justify-between w-full">
            <Label>Balance</Label>
            <Input className="w-[200px]" placeholder="Enter current balance" onChange={(e) => setBalance(e.target.value)}/>
          </div>
          <div className="flex items-center gap-2 justify-between w-full">
            <Label>Password</Label>
            <Input className="w-[200px]" placeholder="Enter password" onChange={(e) => setPassword(e.target.value)}/>
          </div>
          <div className="flex items-center gap-2 justify-between w-full">
            <Label>Pin</Label>
            <Input className="w-[200px]" placeholder="Enter pin" onChange={(e) => setPin(e.target.value)}/>
          </div>
          <div className="flex justify-between w-full items-center">
            <Link href='/auth/login'><Button variant='outline'>Login</Button></Link>
            <Button onClick={signupHandler}>{loading? <TbLoader className="text-xl animate-spin"/> :'Signup'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}