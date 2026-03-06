/**
 * Next.js API 路由 - Admin/SuperAdmin 更新 gender-map.json
 * 所有文件 complete 后由前端统一调用一次，避免并发写入的 race condition
 * 服务器端代理，保护 API Key
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const AWS_API_URL = process.env.TRYON_AWS_API_URL || ''
    const AWS_API_KEY = process.env.TRYON_AWS_API_KEY || ''

    if (!AWS_API_URL || !AWS_API_KEY) {
      return NextResponse.json({ error: '服务器未配置 TRYON_AWS_API_URL / TRYON_AWS_API_KEY' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${AWS_API_URL}/gender-map/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AWS_API_KEY,
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'gender-map 更新失败' }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Gender map update API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}


