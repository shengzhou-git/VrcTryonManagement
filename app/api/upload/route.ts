/**
 * Next.js API 路由 - 上传图片
 * 服务器端代理，保护 API Key
 */

import { NextRequest, NextResponse } from 'next/server'

const AWS_API_URL = process.env.AWS_API_URL || ''
const AWS_API_KEY = process.env.AWS_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    if (!AWS_API_URL || !AWS_API_KEY) {
      return NextResponse.json({ error: '服务器未配置 AWS_API_URL / AWS_API_KEY' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 调用 AWS API Gateway
    const response = await fetch(`${AWS_API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AWS_API_KEY,
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || '上传失败' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

