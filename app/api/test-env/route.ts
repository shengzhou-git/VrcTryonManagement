/**
 * 测试环境变量 API 路由
 * 用于调试 Amplify 环境变量配置
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    hasTryonUrl: !!process.env.TRYON_AWS_API_URL,
    hasTryonKey: !!process.env.TRYON_AWS_API_KEY,
    urlLength: process.env.TRYON_AWS_API_URL?.length || 0,
    keyLength: process.env.TRYON_AWS_API_KEY?.length || 0,
    urlPreview: process.env.TRYON_AWS_API_URL
      ? `${process.env.TRYON_AWS_API_URL.substring(0, 30)}...`
      : 'not set',
    // 列出所有包含 TRYON 或 AWS_API 的环境变量键
    relatedEnvKeys: Object.keys(process.env).filter(
      (k) => k.includes('TRYON') || k.includes('AWS_API')
    ),
    // 列出所有环境变量键（用于调试）
    allEnvKeys: Object.keys(process.env).sort(),
    nodeEnv: process.env.NODE_ENV,
  }

  return NextResponse.json(envCheck, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

