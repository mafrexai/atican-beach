import { NextRequest } from "next/server"
import { createAdminClient, createServerSupabaseClient } from "@/lib/supabase/server"
import { verifyTransaction, isPaystackConfigured } from "@/lib/paystack"
import { finalizeBookingPayment } from "@/lib/payments/finalize"
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

    const server = await createServerSupabaseClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return apiError("Authentication required", 401, "AUTH_REQUIRED")

    const supabase = createAdminClient()
    const { data: booking, error: bookingError } = await supabase.from("bookings")
      .select("id, booking_reference, user_id, guest_email, guest_name, total_amount, payment_status, status")
      .eq("booking_reference", reference).maybeSingle()
    if (bookingError || !booking) return apiError("Booking not found", 404, "BOOKING_NOT_FOUND")

    const { data: assignment } = await supabase.from("user_roles").select("role, is_active").eq("user_id", user.id).maybeSingle()
    const isOperationalUser = assignment?.is_active !== false && ["front_desk", "manager", "admin"].includes(assignment?.role || "")
    if (booking.user_id !== user.id && !isOperationalUser) return apiError("Booking access denied", 403, "BOOKING_ACCESS_DENIED")

    const response = await verifyTransaction(reference)

    if (!response.status) {
      return apiError(response.message || "Payment verification failed", 400, "VERIFICATION_FAILED")
    }

    if (response.data?.status !== "success") {
      return apiError("Payment was not successful", 400, "PAYMENT_FAILED")
    }

    const paidAmount = Number(response.data.amount) / 100
    if (!Number.isFinite(paidAmount) || paidAmount !== Number(booking.total_amount)) {
      console.error("Paystack amount mismatch", { reference, paidAmount, expected: Number(booking.total_amount) })
      return apiError("Payment amount does not match this booking", 409, "AMOUNT_MISMATCH")
    }

    const finalization = await finalizeBookingPayment({
      bookingReference: reference,
      providerReference: response.data.reference,
      paidAmount,
      source: "paystack_verify",
      actorUserId: user.id,
    })

    if (finalization.updated) {
      if (assignment?.role === "front_desk") {
        await supabase.from("staff_activity_logs").insert({ user_id: user.id, actor_role: "front_desk", action: "payment_verified",
          summary: `Verified payment for ${booking.booking_reference}`, category: "payment", severity: "info",
          entity_type: "booking", entity_id: booking.id, details: { reference: response.data.reference, amount: paidAmount } })
      }
    }

    return apiSuccess({
      reference: response.data.reference,
      amount: response.data.amount / 100,
      status: response.data.status,
      customer: response.data.customer,
      booking: finalization.booking,
    })
  } catch (error) {
    console.error("Paystack verify error:", error)
    return apiError(
      "Internal server error: " + (error instanceof Error ? error.message : "Unknown error"),
      500
    )
  }
}
