declare module '@paystack/paystack-sdk' {
  class Paystack {
    constructor(config: { secretKey: string })
    initialize(params: {
      email: string
      amount: number
      reference?: string
      callback_url?: string
      metadata?: Record<string, unknown>
    }): Promise<{
      status: boolean
      message: string
      data: {
        authorization_url: string
        access_code: string
        reference: string
      }
    }>
    verify(params: {
      reference: string
    }): Promise<{
      status: boolean
      message: string
      data: {
        id: number
        status: string
        reference: string
        amount: number
        customer: { email: string }
      }
    }>
  }

  export default Paystack
}