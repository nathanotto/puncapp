import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ message: 'Cookie test' })

  // Try to set a test cookie
  response.cookies.set('test-cookie', 'test-value', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  return response
}
