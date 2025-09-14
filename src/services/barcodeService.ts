import axios from 'axios'

interface BarcodeData {
  barcode: string
  timestamp: string
  metadata: {
    userAgent: string
    ip: string
  }
}

export class BarcodeService {
  private static readonly BARCODE_URL = 'https://hackmit25.s3.us-east-1.amazonaws.com/barcodes.json'
  private cachedBarcode: string | null = null
  private lastFetch: number = 0
  private readonly cacheTimeout = 30000 // 30 seconds cache

  async getCurrentBarcode(): Promise<string | null> {
    const now = Date.now()

    // Return cached barcode if still fresh
    if (this.cachedBarcode && (now - this.lastFetch) < this.cacheTimeout) {
      console.log(`📦 Using cached barcode: ${this.cachedBarcode}`)
      return this.cachedBarcode
    }

    try {
      console.log('🔍 Fetching latest barcode from S3...')
      const response = await axios.get<BarcodeData>(BarcodeService.BARCODE_URL, {
        timeout: 10000,
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      const barcodeData = response.data

      if (barcodeData.barcode) {
        this.cachedBarcode = barcodeData.barcode
        this.lastFetch = now

        console.log(`✅ Fetched barcode: ${barcodeData.barcode}`)
        console.log(`📅 Timestamp: ${barcodeData.timestamp}`)

        return barcodeData.barcode
      } else {
        console.warn('⚠️ No barcode found in response')
        return null
      }
    } catch (error: any) {
      console.error('❌ Error fetching barcode:', error.message)

      // Return cached barcode if available, even if expired
      if (this.cachedBarcode) {
        console.log(`⚠️ Using stale cached barcode: ${this.cachedBarcode}`)
        return this.cachedBarcode
      }

      return null
    }
  }

  async waitForNewBarcode(previousBarcode?: string): Promise<string | null> {
    const maxAttempts = 10
    const delayMs = 3000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Checking for new barcode (attempt ${attempt}/${maxAttempts})...`)

      const currentBarcode = await this.getCurrentBarcode()

      if (currentBarcode && currentBarcode !== previousBarcode) {
        console.log(`🆕 New barcode detected: ${currentBarcode}`)
        return currentBarcode
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    console.log('⏰ Timeout waiting for new barcode')
    return null
  }

  clearCache(): void {
    this.cachedBarcode = null
    this.lastFetch = 0
    console.log('🗑️ Barcode cache cleared')
  }
}