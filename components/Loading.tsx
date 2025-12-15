/**
 * 加载组件
 */

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full spinner mx-auto mb-4" />
        <p className="text-slate-600 font-medium">加载中...</p>
      </div>
    </div>
  )
}

