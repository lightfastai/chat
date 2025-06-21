import { Suspense } from "react"
import { PasswordAuth } from "./PasswordAuth"

export default function PasswordAuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
            <p className="text-gray-600 mt-2">
              Sign in to your account or create a new one
            </p>
          </div>
          <Suspense
            fallback={
              <div className="animate-pulse h-64 bg-gray-100 rounded" />
            }
          >
            <PasswordAuth />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
