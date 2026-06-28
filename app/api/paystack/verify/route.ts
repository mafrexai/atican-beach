import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { verifyTransaction, isPaystackConfigured } from "@/lib/paystack"
import { apiSuccess, apiError } from "@/lib/api/responses"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return apiError("Reference is required", 400, "MISSING_REFERENCE")
    }

    if (!isPaystackConfigured) {
      return apiError("Payment system not configured", 503, "PAYSTACK_NOT_CONFIGURED")
    }

    const response = await verifyTransaction(reference)

    if (!response.status) {
      return apiError(response.message || "Payment verification failed", 400, "VERIFICATION_FAILED")
    }

    if (response.data?.status !== "success") {
      return apiError("Payment was not successful", 400, "PAYMENT_FAILED")
    }

    return apiSuccess({
      reference: response.data.reference,
      amount: response.data.amount / 100,
      status: response.data.status,
      customer: response.data.customer,
    })
  } catch (error) {
    console.error("Paystack verify error:", error)
    return apiError(
      "Internal server error: " + (error instanceof Error ? error.message : "Unknown error"),
      500
    )
  }
}
