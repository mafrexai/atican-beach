import Paystack from '@paystack/paystack-sdk'

const paystack = new Paystack({ secretKey: process.env.PAYSTACK_SECRET_KEY! })

export default paystack