import axios from 'axios'

export interface NanobananaRequest {
  content: Buffer | string
  mimeType?: string
  customPrompt?: string
}

export interface NanobananaResponse {
  success: boolean
  result?: any
  error?: string
}

export class NanobananaService {
  private static readonly NANOBANANA_URL = process.env.NANOBANANA_URL || 'https://api.nanobanana.ai/process'
  private apiKey: string | null

  constructor() {
    this.apiKey = process.env.NANOBANANA_API_KEY || null
    if (!this.apiKey) {
      console.warn('⚠️ NANOBANANA_API_KEY not found - nanobanana processing will be disabled')
    }
  }

  async processContent(request: NanobananaRequest): Promise<NanobananaResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Nanobanana API key not configured'
      }
    }

    try {
      console.log('🍌 Sending content to nanobanana for processing...')

      const payload = {
        content: Buffer.isBuffer(request.content)
          ? request.content.toString('base64')
          : request.content,
        mimeType: request.mimeType || 'application/octet-stream',
        prompt: request.customPrompt || 'Process this content and return optimized results'
      }

      const response = await axios.post(NanobananaService.NANOBANANA_URL, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })

      console.log('✅ Nanobanana processing completed')

      return {
        success: true,
        result: response.data
      }
    } catch (error: any) {
      console.error('❌ Nanobanana processing failed:', error.message)

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown nanobanana error'
      }
    }
  }

  async processPDFWithNanobanana(pdfBuffer: Buffer, customPrompt?: string): Promise<NanobananaResponse> {
    return this.processContent({
      content: pdfBuffer,
      mimeType: 'application/pdf',
      customPrompt: customPrompt || 'Convert this PDF manual into a structured, step-by-step assembly guide with clear instructions and safety warnings.'
    })
  }

  async processTextWithNanobanana(text: string, customPrompt?: string): Promise<NanobananaResponse> {
    return this.processContent({
      content: text,
      mimeType: 'text/plain',
      customPrompt: customPrompt || 'Enhance and structure this text content for better readability and usability.'
    })
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}