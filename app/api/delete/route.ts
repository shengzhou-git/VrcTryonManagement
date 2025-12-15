/**
 * Next.js API 路由 - 删除图片
 * 服务器端代理，保护 API Key
 */

import { NextRequest, NextResponse } from 'next/server'

const AWS_API_URL = process.env.AWS_API_URL || ''
const AWS_API_KEY = process.env.AWS_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 调用 AWS API Gateway
    const response = await fetch(`${AWS_API_URL}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AWS_API_KEY,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || '删除失败' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

