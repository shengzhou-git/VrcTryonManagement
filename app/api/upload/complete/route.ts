/**
 * Next.js API 路由 - 上传完成登记（校验对象存在 + 记录 DynamoDB + 返回预签名 GET URL）
 * 服务器端代理，保护 API Key
 */

import { NextRequest, NextResponse } from 'next/server'

const AWS_API_URL = process.env.TRYON_AWS_API_URL || ''
const AWS_API_KEY = process.env.TRYON_AWS_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    if (!AWS_API_URL || !AWS_API_KEY) {
      console.error('[Upload Complete] Missing env vars:', {
        hasUrl: !!process.env.TRYON_AWS_API_URL,
        hasKey: !!process.env.TRYON_AWS_API_KEY,
      })
      return NextResponse.json({ error: '服务器未配置 TRYON_AWS_API_URL / TRYON_AWS_API_KEY' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const response = await fetch(`${AWS_API_URL}/upload/complete`, {
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
      return NextResponse.json({ error: data.error || '上传完成登记失败' }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Upload complete API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}


