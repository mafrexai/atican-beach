"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Lock, Mail, Eye, EyeOff, UserCheck } from "lucide-react"

export default function ManagerLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    console.log("Manager Login page mounted")
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single()

      if (userRole?.role === "manager") {
        console.log("Manager login successful")
        router.refresh()
        setTimeout(() => router.push("/manager/dashboard"), 300)
        setTimeout(() => window.location.href = "/manager/dashboard", 1000)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()

      if (profile?.role === "manager") {
        console.log("Manager login successful (via profiles)")
        router.refresh()
        setTimeout(() => router.push("/manager/dashboard"), 300)
        setTimeout(() => window.location.href = "/manager/dashboard", 1000)
        return
      }

      await supabase.auth.signOut()
      throw new Error("Unauthorized: Manager access only")
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A3D62] to-[#082032] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0A3D62] rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0A3D62]">Manager Access</h1>
          <p className="text-gray-500 mt-2">Atican Beach Resort</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0A3D62] text-gray-900 placeholder:text-gray-400"
                placeholder="manager@aticanbeach.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0A3D62] text-gray-900 placeholder:text-gray-400"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A3D62] text-white py-2 rounded-lg hover:bg-[#082032] transition disabled:opacity-50 font-semibold"
          >
            {loading ? "Signing in..." : "Access Manager Dashboard"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <a href="/" className="text-sm text-gray-500 hover:text-[#0A3D62] transition">&larr; Back to Atican Beach</a>
        </div>
      </div>
    </div>
  )
}
