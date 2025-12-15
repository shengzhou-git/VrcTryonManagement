'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { Language, languageNames } from '@/lib/i18n/translations'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
        aria-label="Language Switcher"
      >
        <Globe className="w-5 h-5 text-slate-600" />
        <span className="text-sm font-medium text-slate-700">
          {languageNames[language]}
        </span>
        <svg
          className={`w-4 h-4 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-fade-in">
          {(['zh', 'en', 'ja'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                language === lang
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {languageNames[lang]}
              {language === lang && (
                <span className="ml-2 text-primary-600">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

