'use client'

import { useEffect, useState, useCallback } from 'react'

interface AddressData {
  zonecode: string      // 우편번호
  address: string       // 기본 주소
  addressType: string   // 주소 타입 (R: 도로명, J: 지번)
  bname: string         // 법정동/법정리 이름
  buildingName: string  // 건물명
}

interface AddressSearchProps {
  onComplete: (address: string, zonecode: string) => void
  className?: string
  disabled?: boolean
}

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: AddressData) => void
        onclose?: (state: string) => void
      }) => {
        open: () => void
        embed: (element: HTMLElement) => void
      }
    }
  }
}

const DAUM_POSTCODE_SCRIPT_URL = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

export function AddressSearch({ onComplete, className = '', disabled = false }: AddressSearchProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 스크립트 로드
  useEffect(() => {
    // 이미 로드된 경우
    if (typeof window !== 'undefined' && window.daum?.Postcode) {
      setIsScriptLoaded(true)
      return
    }

    // 이미 스크립트 태그가 있는지 확인
    const existingScript = document.querySelector(`script[src="${DAUM_POSTCODE_SCRIPT_URL}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsScriptLoaded(true))
      return
    }

    // 스크립트 동적 로드
    const script = document.createElement('script')
    script.src = DAUM_POSTCODE_SCRIPT_URL
    script.async = true
    
    script.onload = () => {
      setIsScriptLoaded(true)
      setError(null)
    }
    
    script.onerror = () => {
      setError('주소 검색 서비스를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.')
      setIsLoading(false)
    }

    document.head.appendChild(script)

    return () => {
      // cleanup은 하지 않음 (다른 컴포넌트에서도 사용할 수 있으므로)
    }
  }, [])

  const handleOpenPostcode = useCallback(() => {
    if (!isScriptLoaded) {
      setError('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    if (typeof window === 'undefined' || !window.daum?.Postcode) {
      setError('주소 검색 서비스를 사용할 수 없습니다.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      new window.daum.Postcode({
        oncomplete: (data: AddressData) => {
          // 도로명 주소 우선, 없으면 지번 주소
          let fullAddress = data.address
          let extraAddress = ''

          if (data.addressType === 'R') {
            // 도로명 주소인 경우 추가 정보
            if (data.bname !== '') {
              extraAddress += data.bname
            }
            if (data.buildingName !== '') {
              extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName
            }
            if (extraAddress !== '') {
              fullAddress += ` (${extraAddress})`
            }
          }

          onComplete(fullAddress, data.zonecode)
          setIsLoading(false)
        },
        onclose: (_state: string) => {
          setIsLoading(false)
        },
      }).open()
    } catch (err) {
      console.error('주소 검색 오류:', err)
      setError('주소 검색 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }, [isScriptLoaded, onComplete])

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleOpenPostcode}
        disabled={disabled || isLoading || !isScriptLoaded}
        className={`
          px-4 py-2.5 rounded-xl font-semibold text-sm transition-all
          ${disabled || isLoading || !isScriptLoaded
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            검색 중...
          </span>
        ) : !isScriptLoaded ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-300/30 border-t-gray-400 rounded-full animate-spin" />
            로딩 중...
          </span>
        ) : (
          '주소 검색'
        )}
      </button>
      
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}