import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Socket.io server not yet initialized. Start server separately.' });
}

// Note: Socket.io requires a custom server setup
// This file is a placeholder for the API route
// The actual Socket.io server should be started separately
// See server.js in the project root for implementation
